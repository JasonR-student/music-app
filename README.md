# 中国民族音乐赏析 · 教学案例库

Spring Boot 3 + Java 21 + Maven 3.9 后端，国风水墨 UI 前端。

## 技术栈

- Java 21
- Maven 3.9+
- Spring Boot 3.2.5
- 前端：HTML / CSS / JavaScript（Canvas 粒子特效）

## 本地开发

### 1. 构建项目

```bash
mvn clean package -DskipTests
```

### 2. 上传视频文件

视频文件不打包进 jar，放在外部目录。默认目录 `G:/video/`。

视频文件命名规则：`{name}.mp4`，对应 API 接口 `/api/video/{name}`。
例如 `liangzhu.mp4` → 访问 `/api/video/liangzhu`。

### 3. 启动

```bash
java -jar target/music-app-1.0.0.jar
```

启动后访问 http://localhost:9000

## 服务器部署

### 1. 拉取代码

```bash
git clone https://github.com/JasonR-student/music-app.git
cd music-app
```

### 2. 构建项目

```bash
mvn clean package -DskipTests
```

### 3. 创建视频目录并上传视频

```bash
mkdir -p /opt/video
# 用 scp/sftp 将 liangzhu.mp4 上传到 /opt/video/
# scp liangzhu.mp4 user@server:/opt/video/
```

### 4. 启动（指定视频目录和端口）

```bash
java -jar target/music-app-1.0.0.jar \
  --video.storage-dir=/opt/video \
  --server.port=9000
```

### 5. 后台运行（推荐用 nohup）

```bash
nohup java -jar target/music-app-1.0.0.jar \
  --video.storage-dir=/opt/video \
  --server.port=9000 \
  > app.log 2>&1 &
```

## 配置说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `server.port` | 9000 | 服务端口 |
| `video.storage-dir` | G:/video | 视频文件存储目录 |

所有配置均可通过 `application.yml` 或命令行参数 `--key=value` 覆盖。

## API 接口

| 接口 | 说明 |
|------|------|
| `GET /` | 首页 |
| `GET /player.html` | 视频播放页 |
| `GET /api/video/{name}` | 视频流（支持 HTTP Range 分段请求） |
