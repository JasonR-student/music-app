package com.rhan.music.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
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

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 前端可能部署在其它域名（如 Qoder Sites），<video crossorigin> 取不到 CORS 头就会加载失败，
        // Web Audio 分析也只能读到静音，可视化整体失效
        registry.addMapping("/media/video/**").allowedOrigins("*").allowedMethods("GET", "HEAD");
        registry.addMapping("/api/video/**").allowedOrigins("*").allowedMethods("GET", "HEAD");
    }
}
