# 乐见 · 中国民族音乐赏析

> **v1.0.0** — 面向听障人群的音乐可视化翻译系统

面向听障人群的**音乐可视化翻译系统**，以小提琴协奏曲《梁祝》为案例，将音乐实时转化为水墨风格的多模态视觉语言。

Spring Boot 3 + Java 21 后端，Vite + ES Module 前端，国风水墨 UI。

## 截图

<!-- TODO: 添加截图 -->
<!-- | 首页 | 播放页 |
|------|--------|
| ![首页](docs/screenshots/index.png) | ![播放页](docs/screenshots/player.png) | -->

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

## Qoder Sites 静态部署

除自建服务器外，也可作为纯静态站点部署到 Qoder Sites：

```bash
# 1. 准备压缩视频（原始 304 MiB 超出托管单文件上限，需压到 50 MiB 内）
#    两遍编码：640x360 / 24fps / H.264 140kbps + AAC 72kbps，+faststart
ffmpeg -i public/media/liangzhu.mp4 -vf scale=640:360 -r 24 \
  -c:v libx264 -b:v 140k -pass 1 -an -f null NUL
ffmpeg -i public/media/liangzhu.mp4 -vf scale=640:360 -r 24 \
  -c:v libx264 -b:v 140k -pass 2 -c:a aac -b:a 72k -movflags +faststart \
  deploy/public/media/liangzhu.mp4

# 2. 构建静态产物到 deploy/web/
npm run build:deploy
```

`deploy/public/` 只放上线所需资源（图标、封面、海报图、压缩视频），`deploy/web/` 即托管目录；整包约 44 MiB。视频时长保持与原片一致（1679.94s），章节标记无需调整。

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
