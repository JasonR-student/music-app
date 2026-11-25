# 【作品提交】乐见 · 中国民族音乐赏析 —— 让听障朋友"看见"《梁祝》

![封面](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/cover.png)

> **团队名称：** 神奇奶蛙 🐸
> **作品名称：** 乐见 · 中国民族音乐赏析
> **参赛赛道：** 2026 Qoder 高校创造力大赛
> **在线体验：** https://yuejian-qtgst15x4qj.qoder.zone/
> **源码下载：** https://yuejian-qtgst15x4qj.qoder.zone/download/yuejian-source.zip
> **代码仓库：** https://github.com/JasonR-student/music-app

<!-- 已发布：https://tianchi.aliyun.com/forum/post/1109453（2026-11-25 22:22 提交，关联 raceId 532536，标签 可视化/实验代码/学习心得）-->

---

## 一、作品简介

**「乐见」是一套面向听障人群的音乐可视化翻译系统。**

它以小提琴协奏曲《梁祝》为案例，通过 Web Audio API 实时提取音频频谱与情感特征，再用 Canvas 粒子引擎把每一个音符"翻译"成流动的水墨画卷——低频化作沉缓的墨滴，高频化作飞舞的花瓣，节拍的强弱变成光晕的明灭。

我们希望：**音乐不再只属于耳朵，也能被眼睛读懂。**

---

## 二、核心功能一览

![首页概览](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/home.png)

- **实时音乐可视化**：音频特征 → 水墨笔画、墨滴粒子、光晕、旋律线、频谱粒子等多层渲染
- **章节叙事系统**：《梁祝》8 个乐章自动匹配叙事文本，支持中英双语切换
- **情感曲线**：进度条上方叠加实时情感强度，一眼看清全曲起伏
- **四时主题**：粒子形态随时段与季节变化（春花、夏雨、秋叶、冬雪）
- **触觉反馈**：Web Vibration API 把节拍转化为手机振动，让"节奏"可被触摸
- **移动端手势**：双击快进/快退、滑动调亮度音量、长按切倍速
- **无障碍设计**：ARIA 标注 + 键盘导航 + 高对比度模式 + 暗色主题

---

## 三、技术架构

![技术架构](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/arch.png)

| 层 | 技术选型 | 说明 |
|------|---------|------|
| 后端 | Java 21 + Spring Boot 3.2.5 + Maven | 单 JAR 内嵌静态资源，一键部署 |
| 前端构建 | Vite 6 + Terser + ES Module | 零框架依赖，极致轻量 |
| 音频分析 | Web Audio API + Web Worker | FFT 频谱提取，计算不阻塞主线程 |
| 可视化 | Canvas 2D 多层渲染管线 | 60fps 流畅运行 |
| 视频托管 | 华为云 ECS + Nginx | 独立端口 + CORS 跨域 |
| 静态部署 | Qoder Sites | 50MB 限制下的极限优化 |

### 3.1 七层 Canvas 渲染管线

![渲染管线](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/render.png)

每一帧画面由多个独立 Canvas 层从底到顶合成：水墨背景、渐变底色、频谱柱状、粒子系统、波形叠加、节拍脉冲、情感曲线。粒子采用对象池复用，避免频繁 GC；渲染统一由 `requestAnimationFrame` 调度器驱动。

### 3.2 Web Worker 音频特征提取

主线程每帧把频域/时域数据发给 Worker，Worker 计算并回传 `rms`（能量）、`spectralCentroid`（音色亮度）、`beatDetected`（节拍检测）、`subBands`（6 段频段能量）等特征，主线程据此驱动可视化。Worker 不可用时自动降级到主线程计算，保证不崩。

### 3.3 三级视频源回退链

高清《梁祝》视频超过 Qoder Sites 单文件限制，因此设计了优先级链：Spring Boot 后端 → 站点相对路径 → 华为云 HTTPS 直链，配合 `crossorigin="anonymous"` 让跨域媒体也能被 Web Audio 分析。

---

## 四、关键截图

![播放器与可视化](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/player.png)

![章节导航](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/chapter.png)

![移动端适配](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/mobile.png)

![团队横幅](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/team-banner.png)

---

## 五、我们踩过的坑

![Bug 修复](https://yuejian-qtgst15x4qj.qoder.zone/screenshots/bugs.png)

开发过程中修复了 8 个关键问题，几个印象最深的：

1. **`qualCurveTo` 拼写错误** —— 一个字母导致整个 rAF 渲染链崩溃，可视化全挂。
2. **`createMediaElementSource` 重复调用抛 `InvalidStateError`** —— catch 块里还藏着空引用。
3. **移动端双击 seek 误触发播放/暂停** —— 浏览器合成 click 事件，需要标志位拦截。
4. **「乐见」开关的异步竞态** —— `init()` 回调会覆盖用户的关闭操作，必须在回调里复查状态。
5. **`AudioContext.resume()` 未 await** —— 导致可视化前几帧音频数据全为零。

---

## 六、如何本地运行

```bash
# 1. 下载源码包
# https://yuejian-qtgst15x4qj.qoder.zone/download/yuejian-source.zip
unzip yuejian-source.zip && cd vedioWeb

# 2. 前端（Vite 开发服务器）
npm install
npm run dev

# 3. 后端（Spring Boot，可选，用于本地视频服务）
# 需要 JDK 21 + Maven
mvn spring-boot:run
```

> 说明：源码包不含数百 MB 的《梁祝》高清视频，运行时会按"三级回退链"自动请求在线视频源；本地开发亦可替换为自己的视频文件。

---

## 七、体验与源码

- 🌐 **在线体验**：https://yuejian-qtgst15x4qj.qoder.zone/
- 📦 **源码下载（.zip）**：https://yuejian-qtgst15x4qj.qoder.zone/download/yuejian-source.zip
- 🐙 **代码仓库**：https://github.com/JasonR-student/music-app

---

**「乐见」不只是一个播放器，它是听障朋友感受音乐之美的桥梁。**

当《梁祝》的旋律化作屏幕上流动的水墨，当每一个音符都变成跳跃的粒子，我们知道——**音乐，终于可以"看见"了。**

如果这个项目打动了你，欢迎给我们一个 Star ⭐；如果你身边也有听障朋友，请告诉我们 TA 看完之后的感受 💚。

---

*团队：神奇奶蛙* 🐸
*#天池大赛 #音乐可视化 #WebAudio #Canvas #无障碍*
