# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-11-05

### 🚀 Features (Phase B)

- **频谱粒子系统**: Real-time audio spectrum visualization with particles
- **水墨晕染升级**: 7-layer Canvas rendering (background wash → ink wash → strokes → drops → glows → melody → spectrum)
- **章节主题切换**: 8 chapters with seasonal themes (spring/summer/autumn/winter) and time-of-day (dawn/morning/noon/dusk/night/midnight)
- **情感曲线可视化**: Emotion curve canvas overlay showing volume/brightness/beat over time
- **多语言字幕支持**: Chinese/English bilingual narrative system with `t()` helper
- **章节跳转交互**: Chapter markers on progress bar with percentage-based positioning
- **乐见工具栏自动隐藏**: Toolbar auto-hides after 3s of inactivity, shows on mouse/touch

### ⚡ Performance (Phase A)

- **统一 rAF 调度器**: Merged 3 independent requestAnimationFrame loops into MainLoop scheduler
- **对象池**: Gradient object pooling to reduce GC pressure
- **Web Worker 音频分析**: Offloaded FFT, beat detection, spectral flux to audio-worker.js
- **Transferable ArrayBuffers**: Zero-copy Worker communication
- **Canvas 渲染节流**: Adaptive frame throttling (30fps stable / 60fps on beats)
- **粒子数量自适应**: Dynamic particle limits based on avgFrameTime
- **Canvas `{ alpha: false }`**: Disabled alpha channel for performance

### 🎨 UX (Phase C)

- **移动端触摸手势**: Left/right swipe (brightness), double tap (seek ±10s), long press (speed cycle)
- **控制条移动端适配**: Responsive controls with horizontal scroll on small screens
- **ARIA 可访问性**: role="region", aria-live="polite", role="toolbar", role="button"
- **键盘导航增强**: Space (play/pause), ArrowLeft/Right (seek), m (mute), f (fullscreen), ArrowUp/Down (chapters)
- **暗色模式**: CSS prefers-color-scheme + manual toggle with Canvas background adaptation
- **高对比度模式**: @media (prefers-contrast: high) variables

### 🏗️ Code Quality (Phase D)

- **EventBus 解耦**: Pub/sub pattern for module communication (on/off/emit/once)
- **ES Module 迁移**: All JS modules use import/export, bundled by Vite
- **Vite 构建工具**: Multi-page app build with Terser minification and file hashing
- **frontend-maven-plugin**: Automated Node.js + Vite build during `mvn package`
- **单元测试**: 42 tests across 4 files (event-bus, narrative-engine, haptic-engine, main-loop)
- **消除双份文件**: Single source of truth in js/ directory, build output to src/main/resources/static/

### 📦 Infrastructure

- Spring Boot 3.2.5 + Java 21 + Maven 3.9
- Vite 6.0 + Vitest 2.1
- GitHub Actions ready (build pipeline documented in README)
- Video streaming API with HTTP Range support

[1.0.0]: https://github.com/JasonR-student/music-app/releases/tag/v1.0.0
