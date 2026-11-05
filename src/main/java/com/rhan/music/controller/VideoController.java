package com.rhan.music.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 视频流接口 —— 支持 HTTP Range 请求（大视频分段流式播放）
 */
@RestController
@RequestMapping("/api/video")
public class VideoController {

    @Value("${video.storage-dir}")
    private String videoStorageDir;

    /**
     * 流式播放视频，支持 Range 请求
     * GET /api/video/liangzhu
     */
    @GetMapping("/{name}")
    public ResponseEntity<Resource> getVideo(
            @PathVariable String name,
            @RequestHeader(value = "Range", required = false) String rangeHeader
    ) throws IOException {
        // 只允许安全的文件名
        if (!name.matches("[a-zA-Z0-9_\\-]+")) {
            return ResponseEntity.badRequest().build();
        }

        Path videoPath = Paths.get(videoStorageDir, name + ".mp4");
        java.io.File videoFile = videoPath.toFile();

        if (!videoFile.exists()) {
            return ResponseEntity.notFound().build();
        }

        long fileLength = videoFile.length();

        // 无 Range 请求 → 返回完整文件
        if (rangeHeader == null || rangeHeader.isEmpty()) {
            FileSystemResource resource = new FileSystemResource(videoFile);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, "video/mp4")
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .contentLength(fileLength)
                    .body(resource);
        }

        // 解析 Range: bytes=start-end
        String rangeValue = rangeHeader.replace("bytes=", "");
        String[] ranges = rangeValue.split("-");
        long start = Long.parseLong(ranges[0]);
        long end = ranges.length > 1 && !ranges[1].isEmpty()
                ? Long.parseLong(ranges[1])
                : fileLength - 1;

        if (start >= fileLength) {
            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileLength)
                    .build();
        }

        long contentLength = end - start + 1;

        // 使用 InputStreamResource 流式传输，避免大文件内存问题
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, "video/mp4");
        headers.add(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.add(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileLength);
        headers.setContentLength(contentLength);

        // 创建一个只读取指定区间的 InputStream
        java.io.InputStream inputStream = new java.io.InputStream() {
            private final RandomAccessFile raf;
            private long remaining;
            {
                try {
                    raf = new RandomAccessFile(videoFile, "r");
                    raf.seek(start);
                    remaining = contentLength;
                } catch (java.io.IOException e) {
                    throw new RuntimeException(e);
                }
            }
            @Override
            public int read() throws java.io.IOException {
                if (remaining <= 0) return -1;
                int b = raf.read();
                if (b >= 0) remaining--;
                return b;
            }
            @Override
            public int read(byte[] b, int off, int len) throws java.io.IOException {
                if (remaining <= 0) return -1;
                int toRead = (int) Math.min(len, remaining);
                int read = raf.read(b, off, toRead);
                if (read > 0) remaining -= read;
                return read;
            }
            @Override
            public void close() throws java.io.IOException {
                raf.close();
            }
        };

        org.springframework.core.io.InputStreamResource resource = new org.springframework.core.io.InputStreamResource(inputStream);
        return new ResponseEntity<>(resource, headers, HttpStatus.PARTIAL_CONTENT);
    }
}
