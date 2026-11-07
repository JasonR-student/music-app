# 乐见 · 中国民族音乐赏析

> **v1.0.0** — 面向听障人群的音乐可视化翻译系统

面向听障人群的**音乐可视化翻译系统**，以小提琴协奏曲《梁祝》为案例，将音乐实时转化为水墨风格的多模态视觉语言。

Spring Boot 3 + Java 21 后端，Vite + ES Module 前端，国风水墨 UI。

## 截图

| 首页概览 | 播放器与可视化 |
|----------|----------------|
| ![首页](vibe_images/homepage-overview_1793968516517_12ca25da.png) | ![播放器](vibe_images/player-visualization_1793968542822_3a63bf8c.png) |

| 章节导航 | 移动端适配 |
|----------|------------|
| ![章节](vibe_images/chapter-navigation_1793968569430_e965fbe0.png) | ![移动端](vibe_images/mobile-responsive_1793968590348_a2eae6c1.png) |

| 技术架构 | 7 层渲染管线 |
|----------|--------------|
| ![架构](vibe_images/architecture-diagram_1793968619799_0359ce37.png) | ![渲染](vibe_images/audio-visualization-tech_1793968650590_95b0e3f5.png) |

## 功能特性

- **实时音乐可视化**：音频特征 → 水墨笔画、墨滴粒子、光晕、旋律线、频谱粒子 6 层渲染
- **章节叙事系统**：8 个乐章章节自动匹配叙事文本 + 中英文双语切换
- **春夏秋冬 / 晨昏主题**：粒子形态随时段与季节变化（花瓣、墨雨、枯叶、雪花）
- **情感曲线**：进度条上方叠加实时情感强度可视化
- **触觉反馈**：Web Vibration API 将节拍转化为移动端振动
- **暗色模式**：CSS 变量 + 手动切换 + localStorage 持久化
- **移动端手势**：滑动调亮度/音量、双击快进/退、长按切倍速
- **工具栏自动隐藏**：乐见工具栏与控制条同步显示/隐藏，不遮挡画面
- **无障碍**：ARIA 标注 + 键盘导航 + 高对比度模式

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Java 21, Spring Boot 3.2.5, Maven |
| 前端构建 | Vite 6, Terser, ES Module |
| 前端 | HTML5 Canvas, Web Audio API, Web Worker |
| 测试 | Vitest (42 tests) |
| 部署 | 单 JAR, 内嵌静态资源 |

## 项目结构

```
vedioWeb/
├── index.html / player.html      # Vite 入口 (HTML)
├── styles.css                    # 源码 CSS
├── js/                           # ES Module 源码 (12 files)
│   ├── event-bus.js              # 发布/订阅事件总线
│   ├── main-loop.js              # 统一 rAF 调度器
│   ├── music-analyzer.js         # 音频分析 (主线程)
│   ├── audio-worker.js           # 音频特征提取 (Web Worker)
│   ├── visual-translator.js      # 视觉翻译引擎 (6 层 Canvas)
│   ├── narrative-engine.js       # 章节叙事 + 双语
│   ├── haptic-engine.js          # 触觉反馈
│   ├── emotion-curve.js          # 情感曲线
│   ├── touch-gestures.js         # 移动端手势
│   ├── app.js                    # 粒子特效 + 加载动画
│   ├── player-main.js            # 播放页控制器 (入口)
│   └── index.js                  # 首页入口
├── public/                       # 静态资源 (原样复制到构建输出)
│   ├── media/                    # 视频、封面图
│   └── logo/                     # 图标、SVG
├── tests/                        # Vitest 单元测试
├── package.json                  # 前端依赖
├── vite.config.js                # Vite 构建配置 (Spring Boot 产物)
├── vite.deploy.config.js         # Vite 构建配置 (Qoder Sites 静态部署)
├── deploy/                       # 部署暂存 (gitignore): public/ 裁剪资源 + web/ 构建产物
├── pom.xml                       # Maven 配置 (含 frontend-maven-plugin)
└── src/main/java/                # Spring Boot 后端
```

## 快速开始

### 前提条件

- JDK 21+
- Maven 3.9+
- Node.js 20+（本地前端开发时需要；Maven 构建会自动下载）

### 本地开发

```bash
# 安装前端依赖
npm install

# 启动 Vite 开发服务器 (HMR)
npm run dev

# 运行单元测试
npm test
```

### 生产构建

```bash
# 方式一：Maven 一键构建（自动执行 npm install + vite build）
mvn clean package -DskipTests

# 方式二：单独前端构建
npm run build
```

构建产物输出到 `src/main/resources/static/`，由 Spring Boot 直接交付。

### 启动服务

```bash
# 前台运行
java -jar target/music-app-1.0.0.jar

# 后台运行
nohup java -jar target/music-app-1.0.0.jar > app.log 2>&1 &
```

浏览器访问 `http://localhost:9000`

## 服务器部署

```bash
cd /opt
git clone https://github.com/JasonR-student/music-app.git
cd music-app

# 构建（自动下载 Node.js + 安装依赖 + 前端打包）
mvn clean package -DskipTests

# 确认视频文件
ls -lh /opt/video/liangzhu.mp4
# 若缺失：mkdir -p /opt/video && scp 梁祝.mp4 user@server:/opt/video/liangzhu.mp4

# 启动
nohup java -jar target/music-app-1.0.0.jar > /opt/music-app/app.log 2>&1 &
```

## 视频源优先级

`player.html` 按顺序尝试下列源，前一个 404/失败时浏览器自动回落到下一个：

| 顺序 | 源 | 适用场景 |
|------|-----|----------|
| 1 | `/media/video/liangzhu.mp4` | 自建 Spring Boot：映射到 `video.storage-dir`（默认 `/opt/video`），资源处理器原生支持 Range |
| 2 | `media/liangzhu.mp4` | 站点自带视频（本地开发、自建静态服务器） |
| 3 | 远程直链 | Qoder Sites 静态托管：包体不含视频，整包约 1 MiB |

`<video>` 上的 `crossorigin="anonymous"` 不能省略，否则 Web Audio 从跨域媒体只能读到静音、可视化整体失效；相应地**远程源必须返回 `Access-Control-Allow-Origin`**。Spring 端已在 `WebConfig.addCorsMappings` 为 `/media/video/**` 与 `/api/video/**` 放开跨域（GET/HEAD）。

## 华为云 ECS 提供视频源（推荐）

码率要与带宽匹配：全画质原片约 1.45 Mbps（305 MiB / 28 分钟），压缩版约 210 kbps（43.7 MiB）。ECS 带宽常见 1–5 Mbps，**对外建议提供压缩版**，原片留作下载或内网自建。

```bash
# 1. 本地：压缩出对外版本（两遍编码 640x360 / 24fps / H.264 140kbps + AAC 72kbps，+faststart）
ffmpeg -i public/media/liangzhu.mp4 -vf scale=640:360 -r 24 \
  -c:v libx264 -b:v 140k -pass 1 -an -f null NUL
ffmpeg -i public/media/liangzhu.mp4 -vf scale=640:360 -r 24 \
  -c:v libx264 -b:v 140k -pass 2 -c:a aac -b:a 72k -movflags +faststart \
  deploy/liangzhu.mp4

# 2. 本地：上传到 ECS
scp deploy/liangzhu.mp4 root@<ECS_IP>:/opt/video/liangzhu.mp4
```

`/etc/nginx/conf.d/video.conf`：

```nginx
server {
    listen 443 ssl http2;
    server_name video.example.com;                    # 换成你的域名

    ssl_certificate     /etc/nginx/cert/video.example.com.pem;
    ssl_certificate_key /etc/nginx/cert/video.example.key;

    location /video/ {
        alias /opt/video/;
        types { video/mp4 mp4; }

        add_header Access-Control-Allow-Origin  *                  always;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
        add_header Accept-Ranges               bytes               always;
        add_header Cache-Control               "public, max-age=604800" always;
        # Range 请求由 nginx 静态模块原生支持，无需额外配置
    }
}
```

直链即 `https://video.example.com/video/liangzhu.mp4`，把它填进 `player.html` 的第 3 个 `<source>` 后 `npm run build:deploy`。

前置条件与验证：

- **备案**：中国大陆地域 ECS 用域名对外提供 Web 服务需完成 ICP 备案；未备案可改用中国香港/新加坡地域。证书无法签给 IP，而 Qoder Sites 是 HTTPS 站点，用 `http://IP` 会被当混合内容拦截 —— 所以域名 + 证书是必需的。
- **证书**：华为云 SSL 证书服务可申请免费 DV 证书，或用 `acme.sh` 签 Let's Encrypt；安全组放行 443。
- **三项验证**（全部通过才可用）：

```bash
curl -sI -H "Origin: https://<你的站点域名>" https://video.example.com/video/liangzhu.mp4 \
  | grep -i "^HTTP/\|access-control-allow-origin\|content-type\|accept-ranges\|content-disposition"
curl -s -o /dev/null -w "%{http_code} %{speed_download} B/s\n" \
  -r 0-2097151 https://video.example.com/video/liangzhu.mp4
```

期望：`200`/`206`、`Access-Control-Allow-Origin: *`、`Content-Type: video/mp4`、`Accept-Ranges: bytes`，**且不能出现 `Content-Disposition: attachment`**；下载速率需明显高于视频码率（210 kbps ≈ 26 KB/s）。

## Qoder Sites 静态部署

```bash
npm run build:deploy     # 产物输出到 deploy/web/，即托管目录
```

`deploy/public/` 只放图标、封面与海报图（视频不进托管包），`deploy/web/` 整包约 1 MiB。

> 为什么视频不进托管包：Qoder Sites 单文件上限 50 MiB，且产物上传是**单次 PUT、限时 45 秒**（约需 ≥1 MB/s 稳定上行）。44 MiB 的包在上行不足的网络下传不完，移出视频后包体降到 ~1 MiB。
>
> 为什么不用 GitHub Release 直链：实测（校园网）资源下载仅 9.7 KB/s 且间歇 504，响应还缺 `Access-Control-Allow-Origin`、`Content-Type` 为 `application/octet-stream`、并带 `Content-Disposition: attachment` —— 配 `crossorigin` 时必然加载失败。Release 仅作仓库备份保留。

## 配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `server.port` | 9000 | 服务端口 |
| `video.storage-dir` | /opt/video | 视频文件存储目录 |

视频命名规则：`{name}.mp4` → API `/api/video/{name}`

## API

| 接口 | 说明 |
|------|------|
| `GET /` | 首页 |
| `GET /player.html` | 视频播放页 |
| `GET /api/video/{name}` | 视频流（支持 HTTP Range） |

## 性能优化

- 3 个独立 rAF 循环合并为 1 个统一调度器（MainLoop）
- 音频特征提取移至 Web Worker，主线程零阻塞
- 粒子回收使用 swap-and-pop O(1) 替代 Array.splice O(n)
- Canvas 渲染节流：稳态 30fps，节拍时 60fps
- 粒子数量根据帧间隔自适应调整
- Vite 打包 + Terser 压缩：JS ~58KB → ~37KB (gzip ~14KB)

## 停止服务

```bash
ps aux | grep music-app
kill <PID>
```
