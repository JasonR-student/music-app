package com.rhan.music.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 静态资源 + 视频文件目录映射
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${video.storage-dir}")
    private String videoStorageDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 将 /media/video/** 映射到外部视频目录（支持大文件流式播放）
        String location = videoStorageDir.replace("\\", "/");
        if (!location.endsWith("/")) {
            location += "/";
        }
        registry.addResourceHandler("/media/video/**")
                .addResourceLocations("file:" + location);
    }
}
