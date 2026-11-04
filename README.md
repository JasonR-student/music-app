# 中国民族音乐赏析 · 教学案例库

Spring Boot 3 + Java 21 + Maven 3.9 后端，国风水墨 UI 前端。

## 技术栈

- Java 21
- Maven 3.9+
- Spring Boot 3.2.5
- 前端：HTML / CSS / JavaScript（Canvas 粒子特效）

## 服务器部署全流程

### 前提条件

服务器已安装 **JDK 21** 和 **Maven 3.9+**，视频文件已上传到 `/opt/video/liangzhu.mp4`。

### 第 1 步：拉取代码

```bash
cd /opt
git clone https://github.com/JasonR-student/music-app.git
cd music-app
```

### 第 2 步：构建

```bash
mvn clean package -DskipTests
```

### 第 3 步：确认视频文件就位

```bash
ls -lh /opt/video/liangzhu.mp4
```

如果文件不在，手动上传：
```bash
mkdir -p /opt/video
# 在本地机器执行 scp 上传：
scp 梁祝.mp4 user@服务器IP:/opt/video/liangzhu.mp4
```

### 第 4 步：启动

前台运行（测试用，关掉终端就停）：
```bash
java -jar target/music-app-1.0.0.jar
```

后台运行（生产环境推荐）：
```bash
nohup java -jar target/music-app-1.0.0.jar > /opt/music-app/app.log 2>&1 &
```

### 第 5 步：验证

```bash
# 看日志是否启动成功
tail -f /opt/music-app/app.log

# 测试首页
curl http://localhost:9000

# 测试视频接口（应返回 206）
curl -I --range 0-1023 http://localhost:9000/api/video/liangzhu
```

浏览器访问 `http://服务器IP:9000`

### 第 6 步：停止服务

```bash
# 找到进程
ps aux | grep music-app
# 杀掉
kill <PID>
```

## 配置说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `server.port` | 9000 | 服务端口 |
| `video.storage-dir` | /opt/video | 视频文件存储目录 |

视频文件命名规则：`{name}.mp4` → API 接口 `/api/video/{name}`。
例如 `liangzhu.mp4` → `/api/video/liangzhu`。

如需修改配置，启动时加参数：
```bash
java -jar target/music-app-1.0.0.jar --server.port=8080 --video.storage-dir=/data/video
```

## API 接口

| 接口 | 说明 |
|------|------|
| `GET /` | 首页 |
| `GET /player.html` | 视频播放页 |
| `GET /api/video/{name}` | 视频流（支持 HTTP Range 分段请求） |

## 本地开发（Windows）

```bash
mvn clean package -DskipTests
# 本地开发时视频在 G:/video，覆盖配置即可：
java -jar target/music-app-1.0.0.jar --video.storage-dir=G:/video
```
