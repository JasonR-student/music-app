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

        // 用 RandomAccessFile 读取指定区间
        RandomAccessFile raf = new RandomAccessFile(videoFile, "r");
        raf.seek(start);

        byte[] buffer = new byte[(int) Math.min(contentLength, 1024 * 1024)];
        raf.read(buffer);
        raf.close();

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, "video/mp4");
        headers.add(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.add(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileLength);
        headers.setContentLength(contentLength);

        ByteArrayResource byteArrayResource = new ByteArrayResource(buffer);
        return new ResponseEntity<>(byteArrayResource, headers, HttpStatus.PARTIAL_CONTENT);
    }
}
