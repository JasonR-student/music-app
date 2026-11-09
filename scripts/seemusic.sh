#!/usr/bin/env bash
# seemusic — 「中国民族音乐赏析 · 教学案例库」服务器运维脚本
# 用法: seemusic <build|up|start|stop|restart|status|port|logs|pull|help>
# 本脚本设计为放在仓库 scripts/ 下，通过软链注册为全局命令：
#   sudo ln -sfn /opt/music-app/scripts/seemusic.sh /usr/local/bin/seemusic

set -euo pipefail

# ---------------------------------------------------------------------------
# 路径解析：必须通过软链找到真实脚本位置，不能用 dirname "$0"
# ---------------------------------------------------------------------------
resolve_script_dir() {
  local s="$0" d link
  # 通过 PATH 调用时 $0 可能不含路径，先解析成绝对路径
  case "$s" in
    */*) : ;;
    *) if command -v "$s" >/dev/null 2>&1; then s="$(command -v "$s")"; fi ;;
  esac
  while [ -L "$s" ]; do
    d="$(cd -P "$(dirname "$s")" && pwd)"
    link="$(readlink "$s")"
    case "$link" in
      /*) s="$link" ;;
      *)  s="$d/$link" ;;
    esac
  done
  (cd -P "$(dirname "$s")" && pwd)
}

SCRIPT_DIR="$(resolve_script_dir)"
ROOT="$(cd -P "$SCRIPT_DIR/.." && pwd)"

JAR_NAME="music-app-1.0.0.jar"
JAR="$ROOT/target/$JAR_NAME"
STATIC="$ROOT/src/main/resources/static"
YML="$ROOT/src/main/resources/application.yml"
RUN="$ROOT/run"
PID_FILE="$RUN/seemusic.pid"
APP_LOG="$RUN/app.log"
BUILD_LOG="$RUN/build.log"
CONF="$ROOT/.seemusic.conf"
DEFAULT_PORT=9000
JAVA_BIN="${JAVA_BIN:-java}"

# ---------------------------------------------------------------------------
# 输出工具
# ---------------------------------------------------------------------------
ok()    { printf '[ OK ] %s\n' "$*"; }
warn()  { printf '[WARN] %s\n' "$*" >&2; }
err()   { printf '[ERR ] %s\n' "$*" >&2; }
die()   { local c="$1"; shift; err "$*"; exit "$c"; }
ensure_run() { mkdir -p "$RUN" 2>/dev/null || die 2 "无法创建 $RUN，请检查目录权限（sudo chown -R \$USER $ROOT）"; }

# 从 application.yml 读取视频目录，避免脚本内硬编码 /opt/video
video_dir() {
  local d
  d="$(sed -n 's/^[[:space:]]*storage-dir:[[:space:]]*//p' "$YML" 2>/dev/null | tail -1 | tr -d '\r' || true)"
  printf '%s' "${d:-/opt/video}"
}

# ---------------------------------------------------------------------------
# 端口配置：.seemusic.conf 的 PORT=N，非法/缺失回落 9000
# ---------------------------------------------------------------------------
PORT="$DEFAULT_PORT"
PORT_SRC="default"
read_port() {
  PORT="$DEFAULT_PORT"
  PORT_SRC="default"
  [ -f "$CONF" ] || return 0
  local v
  v="$(sed -n 's/^PORT=//p' "$CONF" 2>/dev/null | tail -1 | tr -d '[:space:]' || true)"
  case "$v" in
    ''|*[!0-9]*)
      warn ".seemusic.conf 中 PORT 非法，回落 $DEFAULT_PORT"
      return 0
      ;;
  esac
  if [ "$v" -ge 1 ] && [ "$v" -le 65535 ]; then
    PORT="$v"
    PORT_SRC="conf"
  else
    warn ".seemusic.conf 中 PORT=$v 越界，回落 $DEFAULT_PORT"
  fi
}

# ---------------------------------------------------------------------------
# PID 文件：格式为 "pid starttime port"
# starttime (/proc/<pid>/stat 第 22 字段) 用于防止 PID 复用导致误杀
# ---------------------------------------------------------------------------
proc_state()    { awk '{print $3}'  "/proc/$1/stat" 2>/dev/null || true; }
proc_starttime(){ awk '{print $22}' "/proc/$1/stat" 2>/dev/null || true; }

is_ours() {
  local p="$1" st="$2" cmd=""
  [ -d "/proc/$p" ] || return 1
  if [ "$(proc_state "$p")" = "Z" ]; then return 1; fi
  # 不用管道 + grep -q：pipefail 下 grep 提前退出可能让 tr 收到 SIGPIPE 而误判
  cmd="$(tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null || true)"
  case "$cmd" in
    *"$JAR_NAME"*) : ;;
    *) return 1 ;;
  esac
  # starttime 为空/unknown 时降级为仅 cmdline 校验，避免 PID 文件字段错位
  if [ -n "$st" ] && [ "$st" != "unknown" ] && [ "$(proc_starttime "$p")" != "$st" ]; then
    return 1
  fi
  return 0
}

# 打印有效 PID；陈旧/不匹配只清理 PID 文件，绝不 kill
running_pid() {
  local rec p st
  [ -f "$PID_FILE" ] || return 1
  rec="$(awk 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1, $2; exit}' "$PID_FILE" 2>/dev/null || true)"
  [ -n "$rec" ] || { rm -f "$PID_FILE"; return 1; }
  p="${rec%% *}"
  st="${rec#* }"
  if is_ours "$p" "$st"; then
    printf '%s' "$p"
    return 0
  fi
  rm -f "$PID_FILE"
  return 1
}

running_port() {
  [ -f "$PID_FILE" ] || return 0
  awk 'NF>=3 && $1 ~ /^[0-9]+$/ {print $3; exit}' "$PID_FILE" 2>/dev/null || true
}

process_alive() {
  local p="$1"
  [ -d "/proc/$p" ] || return 1
  if [ "$(proc_state "$p")" = "Z" ]; then return 1; fi
  kill -0 "$p" 2>/dev/null
}

# ---------------------------------------------------------------------------
# 端口探测：ss -> lsof -> netstat -> /dev/tcp 逐级降级
# ---------------------------------------------------------------------------
listen_line() {
  local p="$1" out=""
  if command -v ss >/dev/null 2>&1; then
    out="$(ss -ltnp 2>/dev/null | awk -v p="$p" '$4 ~ (":" p "$") {print}' | head -3 || true)"
    [ -n "$out" ] && { printf '%s\n' "$out"; return 0; }
  fi
  if command -v lsof >/dev/null 2>&1; then
    out="$(lsof -nP -iTCP:"$p" -sTCP:LISTEN 2>/dev/null | head -4 || true)"
    [ -n "$out" ] && { printf '%s\n' "$out"; return 0; }
  fi
  if command -v netstat >/dev/null 2>&1; then
    out="$(netstat -ltnp 2>/dev/null | awk -v p="$p" '$4 ~ (":" p "$") && /LISTEN/ {print}' | head -3 || true)"
    [ -n "$out" ] && { printf '%s\n' "$out"; return 0; }
  fi
  return 1
}

port_owner_pid() {
  local p="$1" out=""
  if command -v ss >/dev/null 2>&1; then
    out="$(ss -ltnp 2>/dev/null | awk -v p="$p" '$4 ~ (":" p "$") {print}' \
          | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)"
    [ -n "$out" ] && { printf '%s' "$out"; return 0; }
  fi
  if command -v lsof >/dev/null 2>&1; then
    out="$(lsof -nP -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)"
    [ -n "$out" ] && { printf '%s' "$out"; return 0; }
  fi
  if command -v netstat >/dev/null 2>&1; then
    out="$(netstat -ltnp 2>/dev/null \
          | awk -v p="$p" '$4 ~ (":" p "$") && /LISTEN/ {split($NF,a,"/"); if (a[1] ~ /^[0-9]+$/) print a[1]}' \
          | head -1 || true)"
    [ -n "$out" ] && { printf '%s' "$out"; return 0; }
  fi
  return 1
}

port_busy() {
  local p="$1"
  [ -n "$(listen_line "$p" || true)" ] && return 0
  # 工具全缺失时用 bash 内建 /dev/tcp 兜底；子 shell 退出会自动关闭 fd
  if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then
    return 0
  fi
  return 1
}

# ---------------------------------------------------------------------------
# 前置检查（外网探测只告警，不阻断构建）
# ---------------------------------------------------------------------------
preflight() {
  command -v "$JAVA_BIN" >/dev/null 2>&1 \
    || die 2 "缺少 java（可用 JAVA_BIN 指定路径）；需 JDK 21+：sudo apt install -y openjdk-21-jdk"
  command -v mvn >/dev/null 2>&1 \
    || die 2 "缺少 maven：sudo apt install -y maven"

  local jv jmajor
  jv="$("$JAVA_BIN" -version 2>&1 | head -1 | grep -o '"[^"]*"' | head -1 | tr -d '"' || true)"
  jmajor="${jv%%.*}"
  if [ "$jmajor" = "1" ]; then
    jmajor="$(printf '%s' "$jv" | cut -d. -f2)"
  fi
  case "$jmajor" in
    ''|*[!0-9]*) warn "无法解析 Java 版本 '$jv'，跳过版本检查" ;;
    *)
      [ "$jmajor" -ge 21 ] || die 2 "Java 版本过低（$jv），Spring Boot 3 需 JDK 21 及以上"
      ;;
  esac

  local mver mmajor mminor
  mver="$(mvn -v 2>&1 | sed -n 's/^Apache Maven \([0-9][0-9.]*\).*/\1/p' | head -1 || true)"
  if [ -n "$mver" ]; then
    mmajor="${mver%%.*}"
    mminor="$(printf '%s' "$mver" | cut -d. -f2)"
    case "$mmajor" in
      ''|*[!0-9]*) : ;;
      *) [ "$mmajor" -ge 3 ] || die 2 "Maven 版本过低（$mver），需 3.x" ;;
    esac
    case "$mminor" in
      ''|*[!0-9]*) : ;;
      *) if [ "$mmajor" -eq 3 ] && [ "$mminor" -lt 9 ]; then
           warn "Maven $mver 低于推荐的 3.9；若构建异常请先升级"
         fi ;;
    esac
  fi

  if command -v curl >/dev/null 2>&1; then
    if ! curl -fsS --max-time 6 -o /dev/null https://registry.npmjs.org/ 2>/dev/null; then
      warn "npm registry 探测失败：构建需 npm install，请检查外网或配置镜像"
    fi
    if ! curl -fsS --max-time 6 -o /dev/null https://nodejs.org/dist/ 2>/dev/null; then
      warn "nodejs.org 探测失败（国内服务器常见）：frontend-maven-plugin 需下载 Node v20.18.0"
      warn "  可在 pom.xml 配 <nodeDownloadRoot> 指向镜像；离线环境需预置 node/ 与 npm 缓存"
    fi
  fi
  ok "前置检查完成：java=$(printf '%s' "${jv:-unknown}") maven=$(printf '%s' "${mver:-unknown}")"
}

# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------
cmd_build() {
  preflight
  ensure_run
  printf '[ .. ] 构建中（自动下载 Node v20.18.0 + npm install + vite build），日志: %s\n' "$BUILD_LOG"
  if (cd "$ROOT" && mvn -B clean package -DskipTests) 2>&1 | tee "$BUILD_LOG"; then
    :
  else
    err "Maven 构建失败，日志尾部："
    tail -80 "$BUILD_LOG" 2>/dev/null || true
    err "常见原因：1) 服务器无法访问 nodejs.org / npm registry  2) Node 下载被墙需配镜像  3) npm 依赖拉取失败"
    err "完整日志：$BUILD_LOG"
    exit 6
  fi

  [ -s "$JAR" ] || die 6 "构建结束但未生成 $JAR"
  [ -f "$STATIC/index.html" ] && [ -f "$STATIC/player.html" ] \
    || die 6 "Vite 多入口产物缺失：$STATIC/index.html 或 player.html"

  if command -v unzip >/dev/null 2>&1; then
    local jarlist=""
    jarlist="$(unzip -l "$JAR" 2>/dev/null || true)"
    case "$jarlist" in
      *static/index.html*) : ;;
      *) warn "JAR 内未找到 static/index.html，首页可能 404；请检查 Maven 资源打包顺序" ;;
    esac
  fi

  local sz=0
  if command -v stat >/dev/null 2>&1; then
    sz="$(stat -c%s "$JAR" 2>/dev/null || printf 0)"
  fi
  ok "JAR 已生成：$JAR ($((sz / 1048576)) MB)"
  if [ "$sz" -gt 104857600 ]; then
    warn "JAR 超过 100MB：检查 public/media/*.mp4 是否被 Vite 复制进 static/ 一起打包"
  fi

  local vd
  vd="$(video_dir)"
  if [ ! -s "$vd/liangzhu.mp4" ]; then
    warn "$vd/liangzhu.mp4 缺失：播放页首选源将 404 并回落远程直链"
    warn "  上传：scp 梁祝.mp4 user@服务器:$vd/liangzhu.mp4"
  else
    ok "视频文件就位：$vd/liangzhu.mp4"
  fi
  ok "构建完成，执行 seemusic start 启动（或 seemusic up 一键）"
}

# ---------------------------------------------------------------------------
# start
# ---------------------------------------------------------------------------
wait_ready() {
  local np="$1" p="$2" i
  for i in $(seq 1 30); do
    if ! process_alive "$np"; then
      err "Java 进程早退，日志尾部："
      tail -40 "$APP_LOG" 2>/dev/null || true
      rm -f "$PID_FILE"
      exit 5
    fi
    if curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:$p/" 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  err "30 秒内未就绪（端口 $p 未返回 HTTP 200），日志尾部："
  tail -40 "$APP_LOG" 2>/dev/null || true
  exit 5
}

print_summary() {
  local np="$1" p="$2" ll vd
  ll="$(listen_line "$p" || true)"
  printf '\n'
  ok "启动成功"
  if [ -n "$ll" ]; then
    printf '%s\n' "$ll" | sed 's/^/       /'
  else
    warn "缺少 ss/lsof/netstat，无法打印 LISTEN 行；已通过 HTTP 200 确认端口可用"
  fi
  printf '  实际监听端口 : %s  (来源 .seemusic.conf: %s)\n' "$p" "$PORT_SRC"
  printf '  PID          : %s\n' "$np"
  printf '  访问地址     : http://127.0.0.1:%s/   (公网 http://<服务器IP>:%s/)\n' "$p" "$p"
  printf '  日志         : %s\n' "$APP_LOG"
  printf '  防火墙       : 需放行 TCP %s（sudo ufw allow %s/tcp 或云控制台安全组）\n' "$p" "$p"
  vd="$(video_dir)"
  [ -s "$vd/liangzhu.mp4" ] || warn "$vd/liangzhu.mp4 缺失：播放页首选源 404，将回落远程直链"
}

cmd_start() {
  read_port
  [ -s "$JAR" ] || die 6 "未找到 $JAR，请先执行 seemusic build（或 seemusic up）"
  ensure_run

  local rp=""
  rp="$(running_pid || true)"
  [ -z "$rp" ] || die 4 "服务已在运行 (PID $rp, 端口 $(running_port || true))；重启请执行 seemusic restart"

  if port_busy "$PORT"; then
    local owner=""
    owner="$(port_owner_pid "$PORT" || true)"
    err "端口 $PORT 已被占用，无法启动"
    if [ -n "$owner" ]; then
      ps -p "$owner" -o pid,user,cmd --no-headers 2>/dev/null || true
    else
      warn "无法读取占用者 PID（非 root 时 ss -p 可能不可见），可用 sudo seemusic status 查看"
    fi
    listen_line "$PORT" || true
    err "解决：seemusic port <其他端口> && seemusic start"
    exit 3
  fi

  ok "端口 $PORT 空闲（来源 .seemusic.conf: $PORT_SRC）"
  printf '[ .. ] 启动: %s -jar %s --server.port=%s\n' "$JAVA_BIN" "$JAR" "$PORT"
  nohup "$JAVA_BIN" -jar "$JAR" --server.port="$PORT" > "$APP_LOG" 2>&1 &
  local np=$!
  local st
  st="$(proc_starttime "$np" || true)"
  [ -n "$st" ] || st="unknown"
  printf '%s %s %s\n' "$np" "$st" "$PORT" > "$PID_FILE"

  wait_ready "$np" "$PORT"
  print_summary "$np" "$PORT"
}

# ---------------------------------------------------------------------------
# stop / restart / status
# ---------------------------------------------------------------------------
cmd_stop() {
  local rp="" i
  rp="$(running_pid || true)"
  if [ -z "$rp" ]; then
    ok "服务未运行（无需停止）"
    return 0
  fi
  printf '[ .. ] 停止 PID %s ...\n' "$rp"
  kill "$rp" 2>/dev/null || true
  for i in $(seq 1 15); do
    process_alive "$rp" || break
    sleep 1
  done
  if process_alive "$rp"; then
    warn "15 秒后仍未退出，发送 SIGKILL"
    kill -9 "$rp" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$PID_FILE"
  ok "已停止 (PID $rp)"
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  read_port
  local rp="" ll ap=""
  rp="$(running_pid || true)"
  if [ -z "$rp" ]; then
    printf 'STOPPED   配置端口(下次启动)=%s  来源=%s\n' "$PORT" "$PORT_SRC"
    printf '          日志=%s\n' "$APP_LOG"
    return 4
  fi
  ap="$(running_port || true)"
  printf 'RUNNING   PID=%s\n' "$rp"
  printf '          实际端口(当前)=%s   配置端口(下次启动)=%s  来源=%s\n' "${ap:-unknown}" "$PORT" "$PORT_SRC"
  ll="$(listen_line "${ap:-$PORT}" || true)"
  if [ -n "$ll" ]; then
    printf '%s\n' "$ll" | sed 's/^/  LISTEN /'
  else
    warn "缺少 ss/lsof/netstat，无法打印 LISTEN 行"
  fi
  curl -fsS -o /dev/null -w '  HTTP   / -> %{http_code}\n' "http://127.0.0.1:${ap:-$PORT}/" 2>/dev/null \
    || warn "首页 HTTP 自检失败，详见日志"
  printf '          日志=%s\n' "$APP_LOG"
}

# ---------------------------------------------------------------------------
# port / logs / pull / help
# ---------------------------------------------------------------------------
cmd_port() {
  local p="${1:-}"
  case "$p" in
    ''|*[!0-9]*) die 1 "用法: seemusic port <1-65535>" ;;
  esac
  [ "$p" -ge 1 ] && [ "$p" -le 65535 ] || die 1 "端口必须在 1-65535 之间"
  printf 'PORT=%s\n' "$p" > "$CONF" || die 2 "无法写入 $CONF，请检查目录权限"
  ok "PORT=$p 已写入 $CONF（不改源码、不污染 git）"
  local rp=""
  rp="$(running_pid || true)"
  if [ -n "$rp" ]; then
    warn "服务仍在旧端口 $(running_port || true) 运行，执行 seemusic restart 后生效"
  else
    ok "执行 seemusic start 后生效"
  fi
  printf '  提示：改端口后需同步放行防火墙/安全组 TCP %s\n' "$p"
}

cmd_logs() {
  local follow=0 n=50
  if [ "${1:-}" = "-f" ] || [ "${1:-}" = "--follow" ]; then
    follow=1
    shift
  fi
  n="${1:-50}"
  case "$n" in
    ''|*[!0-9]*) die 1 "用法: seemusic logs [-f] [行数]" ;;
  esac
  [ -f "$APP_LOG" ] || die 4 "日志文件不存在：$APP_LOG"
  if [ "$follow" -eq 1 ]; then
    ok "跟踪 $APP_LOG（Ctrl-C 仅退出跟踪，不会停止服务）"
    tail -F -n "$n" "$APP_LOG"
  else
    tail -n "$n" "$APP_LOG"
  fi
}

cmd_pull() {
  command -v git >/dev/null 2>&1 || die 2 "缺少 git"
  local dirty=""
  dirty="$(cd "$ROOT" && git status --porcelain 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    err "工作区有未提交改动，pull 已中止（脚本不会覆盖本地改动）："
    printf '%s\n' "$dirty"
    exit 7
  fi
  if ! (cd "$ROOT" && git pull --ff-only); then
    die 7 "git pull 失败（非快进或网络问题），请手动处理后再执行 seemusic restart"
  fi
  ok "代码已更新；执行 seemusic up 重新构建并启动（脚本自身也已随仓库更新）"
}

cmd_help() {
  cat <<'EOF'
seemusic — 中国民族音乐赏析 · 教学案例库 运维命令

用法: seemusic <命令> [参数]

  构建与启动
    up                 一键：检查 → 构建 → 停旧实例(若有) → 启动 → 验证 → 打印端口
    build              仅构建（mvn clean package，自动 vite build）
    start              启动后台服务并验证监听，打印端口/PID/地址/日志
    stop               停止服务（SIGTERM，15 秒超时后 SIGKILL）
    restart            stop + start（读取最新端口配置）

  查询与配置
    status             运行状态 + 实测 LISTEN 行 + 实际端口/配置端口
    port <1-65535>     把端口写入 .seemusic.conf，restart 后生效
    logs [-f] [行数]   查看 app.log，默认 50 行，-f 持续跟踪
    pull               git pull --ff-only（工作区有改动会中止）
    help               本帮助

  退出码
    0 成功 / 1 参数错 / 2 前置不满足 / 3 端口被占用 / 4 状态冲突
    5 监听验证失败 / 6 构建失败 / 7 pull 失败
    （status 在服务未运行时返回 4 并显示 STOPPED，属正常查询）

  配置文件
    .seemusic.conf     PORT=N，脚本自动创建，已加入 .gitignore
    run/               seemusic.pid / app.log / build.log，已加入 .gitignore

  首次注册全局命令（仅一次）
    sudo chmod +x /opt/music-app/scripts/seemusic.sh
    sudo ln -sfn /opt/music-app/scripts/seemusic.sh /usr/local/bin/seemusic
EOF
}

# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------
main() {
  local cmd="${1:-help}"
  shift || true
  case "$cmd" in
    up)
      cmd_build
      # up 是「重新构建并启动」：若旧实例在运行，先停再起
      local rp=""
      rp="$(running_pid || true)"
      if [ -n "$rp" ]; then
        ok "检测到旧实例 (PID $rp)，up 将先停止再启动"
        cmd_stop
      fi
      cmd_start
      ;;
    build)     cmd_build ;;
    start)     cmd_start ;;
    stop)      cmd_stop ;;
    restart)   cmd_restart ;;
    status)    cmd_status ;;
    port)      cmd_port "$@" ;;
    logs)      cmd_logs "$@" ;;
    pull)      cmd_pull ;;
    help|--help|-h) cmd_help ;;
    *)
      err "未知命令：$cmd"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
