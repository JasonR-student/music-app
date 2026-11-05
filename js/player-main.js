// player.html 入口 — 组装所有模块并初始化
import { EventBus } from './event-bus.js';
import { MainLoop } from './main-loop.js';
import { MusicAnalyzer } from './music-analyzer.js';
import { VisualTranslator } from './visual-translator.js';
import { NarrativeEngine } from './narrative-engine.js';
import { HapticEngine } from './haptic-engine.js';
import { EmotionCurve } from './emotion-curve.js';
import './touch-gestures.js';
import './app.js';

// ===== 模块间 EventBus 连线 =====
EventBus.on('audio:features', function(data){
  VisualTranslator.update(data.features);
  if(!VisualTranslator.isRunning()) VisualTranslator.start();
  NarrativeEngine.update(data.currentTime);
  HapticEngine.update(data.features);
  EmotionCurve.sample(data.currentTime, data.features);
});

// ===== 暴露到 window 供内联事件使用 =====
window.MusicAnalyzer = MusicAnalyzer;
window.VisualTranslator = VisualTranslator;
window.NarrativeEngine = NarrativeEngine;
window.HapticEngine = HapticEngine;
window.EmotionCurve = EmotionCurve;
window.EventBus = EventBus;

// ===== 播放页视频控制器 =====
const video = document.getElementById('video');
if(!video) throw new Error('Player: video element not found');

const playBtn  = document.getElementById('playBtn');
const iconPlay = playBtn.querySelector('.icon-play');
const iconPause= playBtn.querySelector('.icon-pause');
const track    = document.getElementById('progressTrack');
const ink      = document.getElementById('progressInk');
const thumb    = document.getElementById('progressThumb');
const timeDisp = document.getElementById('timeDisplay');
const muteBtn  = document.getElementById('muteBtn');
const iconVol  = muteBtn.querySelector('.icon-vol');
const iconMute = muteBtn.querySelector('.icon-mute');
const fsBtn    = document.getElementById('fsBtn');
const stage    = document.querySelector('.video-stage');
const speedBtn = document.getElementById('speedBtn');
const speedLbl = document.getElementById('speedLabel');
const resumeBtn= document.getElementById('resumeBtn');
const markers  = document.getElementById('chapterMarkers');

// ===== 「乐见」模块 =====
const vizCanvas = document.getElementById('vizCanvas');
const yjToggle = document.getElementById('yjToggle');
const yjHaptic = document.getElementById('yjHaptic');
const yjStatus = document.getElementById('yjStatus');
const yjToolbar = document.querySelector('.yuejian-toolbar');
const yjText = yjStatus ? yjStatus.querySelector('.yj-text') : null;
const yjDot = yjStatus ? yjStatus.querySelector('.yj-dot') : null;

let yuejianActive = false;
let audioInitialized = false;

if(vizCanvas){
  VisualTranslator.init(vizCanvas);
}

var emotionCanvas = document.getElementById('emotionCurve');
EmotionCurve.init(emotionCanvas);

NarrativeEngine.init({
  title: document.getElementById('narrativeTitle'),
  subtitle: document.getElementById('narrativeSubtitle'),
  story: document.getElementById('narrativeStory'),
  emotion: document.getElementById('narrativeEmotion')
}, function(chapterName, narrative){
  VisualTranslator.setChapter(chapterName);
  HapticEngine.chapterTransition();
});

if(yjHaptic && HapticEngine.supported()){
  yjHaptic.style.display = '';
  yjHaptic.addEventListener('click', function(){
    if(HapticEngine.isEnabled()){
      HapticEngine.disable();
      yjHaptic.classList.remove('yj-active');
    } else {
      HapticEngine.enable();
      yjHaptic.classList.add('yj-active');
    }
  });
}

// 语言切换
var yjLang = document.getElementById('yjLang');
if(yjLang){
  yjLang.addEventListener('click', function(){
    var current = NarrativeEngine.getLanguage();
    var next = current === 'zh' ? 'en' : 'zh';
    NarrativeEngine.setLanguage(next);
    yjLang.querySelector('span').textContent = next === 'zh' ? '中' : 'EN';
  });
}

// 暗色模式切换
var yjDark = document.getElementById('yjDark');
if(yjDark){
  if(localStorage.getItem('yuejian_dark') === '1'){
    document.body.classList.add('dark-mode');
  }
  yjDark.addEventListener('click', function(){
    document.body.classList.toggle('dark-mode');
    var isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('yuejian_dark', isDark ? '1' : '0');
    if(VisualTranslator.isRunning()){
      VisualTranslator.resize();
    }
  });
}

// 乐见开关
if(yjToggle){
  yjToggle.addEventListener('click', function(){
    yuejianActive = !yuejianActive;
    if(yuejianActive) activateYuejian();
    else deactivateYuejian();
  });
}

function activateYuejian(){
  if(vizCanvas) vizCanvas.classList.add('viz-active');
  document.getElementById('narrativeOverlay').classList.add('narrative-active');
  document.body.classList.add('yuejian-active');

  if(vizCanvas) VisualTranslator.resize();
  EmotionCurve.resize();

  if(!audioInitialized){
    MusicAnalyzer.init(video).then(function(){
      audioInitialized = true;
      yuejianActive = true;
      yjToggle.classList.add('yj-active');
      startAnalysis();
      if(yjText) yjText.textContent = '乐见 · 开';
      if(yjDot) yjDot.classList.add('yj-dot-active');
    }).catch(function(e){
      console.warn('音频初始化失败:', e);
      deactivateYuejian();
    });
  } else {
    yuejianActive = true;
    yjToggle.classList.add('yj-active');
    startAnalysis();
    if(yjText) yjText.textContent = '乐见 · 开';
    if(yjDot) yjDot.classList.add('yj-dot-active');
  }
}

function deactivateYuejian(){
  yuejianActive = false;
  yjToggle.classList.remove('yj-active');
  if(vizCanvas) vizCanvas.classList.remove('viz-active');
  document.getElementById('narrativeOverlay').classList.remove('narrative-active');
  document.body.classList.remove('yuejian-active');

  MusicAnalyzer.stop();
  VisualTranslator.stop();
  HapticEngine.stopContinuous();
  EmotionCurve.reset();

  var nt = document.getElementById('narrativeTitle');
  var ns = document.getElementById('narrativeSubtitle');
  var nst = document.getElementById('narrativeStory');
  var ne = document.getElementById('narrativeEmotion');
  if(nt) nt.textContent = '';
  if(ns) ns.textContent = '';
  if(nst) nst.textContent = '';
  if(ne) ne.textContent = '';

  if(yjText) yjText.textContent = '乐见 · 关';
  if(yjDot) yjDot.classList.remove('yj-dot-active');
}

function startAnalysis(){
  MusicAnalyzer.resumeContext();
  MusicAnalyzer.start(function(features){
    EventBus.emit('audio:features', { features: features, currentTime: video.currentTime });
  });
  if(video.currentTime >= 0){
    NarrativeEngine.update(video.currentTime);
  }
}

video.addEventListener('play', function(){
  if(yuejianActive && audioInitialized) MusicAnalyzer.resumeContext();
});

video.addEventListener('pause', function(){
  if(yuejianActive){
    MusicAnalyzer.stop();
    VisualTranslator.stop();
    HapticEngine.stopContinuous();
  }
});

// ===== 视频错误处理 =====
video.addEventListener('error', function(){
  var err = video.error;
  var msg = '视频加载失败';
  if(err){
    if(err.code === err.MEDIA_ERR_SRC_NOT_SUPPORTED) msg = '视频格式不支持';
    else if(err.code === err.MEDIA_ERR_NETWORK) msg = '网络错误，无法加载视频';
    else if(err.code === err.MEDIA_ERR_DECODE) msg = '视频解码失败';
  }
  var errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#d4b27a;font-size:16px;letter-spacing:3px;z-index:20;background:rgba(0,0,0,0.7);';
  errDiv.textContent = msg;
  stage.appendChild(errDiv);
});

// ===== 章节定义 =====
const CHAPTERS = [
  {time:0,    name:'引子'},
  {time:60,   name:'相爱'},
  {time:300,  name:'同窗'},
  {time:480,  name:'相送'},
  {time:660,  name:'抗婚'},
  {time:840,  name:'楼台会'},
  {time:1020, name:'哭灵'},
  {time:1200, name:'化蝶'}
];

// ===== 播放/暂停 =====
function safePlay(){ var p = video.play(); if(p && p.catch) p.catch(function(){}); }
function togglePlay(){ if(video.paused) safePlay(); else video.pause(); }
playBtn.addEventListener('click', togglePlay);
video.addEventListener('click', togglePlay);
video.addEventListener('play', function(){ iconPlay.style.display='none'; iconPause.style.display=''; });
video.addEventListener('pause', function(){ iconPlay.style.display=''; iconPause.style.display='none'; });

// ===== 时间格式化 =====
function fmt(s){
  if(isNaN(s)||s===Infinity) return '0:00';
  const m=Math.floor(s/60), sec=Math.floor(s%60);
  return m+':'+(sec<10?'0':'')+sec;
}

// ===== 进度 =====
video.addEventListener('timeupdate', function(){
  const pct = video.duration ? (video.currentTime/video.duration*100) : 0;
  ink.style.width = pct+'%';
  thumb.style.left = pct+'%';
  timeDisp.textContent = fmt(video.currentTime)+' / '+fmt(video.duration);
  if(video.duration && video.currentTime > 5){
    localStorage.setItem('liangzhu_progress', video.currentTime);
  }
  updateChapterHighlight();
  EmotionCurve.render(video.currentTime);
});

video.addEventListener('loadedmetadata', function(){
  timeDisp.textContent = '0:00 / '+fmt(video.duration);
  renderChapterMarkers();
  restoreProgress();
  EmotionCurve.setDuration(video.duration);
});

// ===== 进度条拖动 =====
let dragging=false;
function seekTo(e){
  const rect=track.getBoundingClientRect();
  const x=(e.clientX||(e.touches&&e.touches[0].clientX))-rect.left;
  const pct=Math.max(0,Math.min(1,x/rect.width));
  if(video.duration) video.currentTime=video.duration*pct;
}
track.addEventListener('mousedown', function(e){dragging=true;seekTo(e);});
document.addEventListener('mousemove', function(e){if(dragging)seekTo(e);});
document.addEventListener('mouseup', function(){dragging=false;});
track.addEventListener('touchstart', function(e){dragging=true;seekTo(e);},{passive:true});
track.addEventListener('touchmove', function(e){if(dragging)seekTo(e);},{passive:true});
track.addEventListener('touchend', function(){dragging=false;});

// ===== 静音 =====
muteBtn.addEventListener('click', function(){
  video.muted=!video.muted;
  iconVol.style.display=video.muted?'none':'';
  iconMute.style.display=video.muted?'':'none';
});

// ===== 全屏 =====
fsBtn.addEventListener('click', function(){
  if(document.fullscreenElement || document.webkitFullscreenElement){
    if(document.exitFullscreen) document.exitFullscreen();
    else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
  } else {
    if(stage.requestFullscreen) stage.requestFullscreen();
    else if(stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
  }
});

function onFullscreenChange(){
  var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  fsBtn.title = isFs ? '退出全屏' : '全屏';
}
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);

// ===== 倍速 =====
const SPEEDS=[0.5,0.75,1,1.25,1.5,2];
let speedIdx=2;
var savedSpeed = localStorage.getItem('liangzhu_speed');
if(savedSpeed){
  var si = SPEEDS.indexOf(parseFloat(savedSpeed));
  if(si >= 0){ speedIdx = si; video.playbackRate = SPEEDS[si]; speedLbl.textContent = SPEEDS[si]+'x'; }
}
speedBtn.addEventListener('click', function(){
  speedIdx=(speedIdx+1)%SPEEDS.length;
  video.playbackRate=SPEEDS[speedIdx];
  speedLbl.textContent=SPEEDS[speedIdx]+'x';
  localStorage.setItem('liangzhu_speed', SPEEDS[speedIdx]);
});

// ===== 播放记忆 =====
function restoreProgress(){
  const saved=localStorage.getItem('liangzhu_progress');
  if(saved && parseFloat(saved)>5){
    const t=parseFloat(saved);
    const resumeHandler=function(){
      resumeBtn.style.display='';
      resumeBtn.onclick=function(){
        video.currentTime=t;
        safePlay();
        resumeBtn.style.display='none';
      };
      video.removeEventListener('canplay', resumeHandler);
    };
    video.addEventListener('canplay', resumeHandler);
  }
}

// ===== 章节跳转 =====
const chapterItems=document.querySelectorAll('.chapter-item');
chapterItems.forEach(function(item){
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');
  item.addEventListener('click', function(){
    const t=parseFloat(item.dataset.time);
    if(video.duration){
      video.currentTime=t;
      safePlay();
    }
  });
  item.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      item.click();
    }
  });
});

// ===== 章节标记 =====
function renderChapterMarkers(){
  if(!video.duration || !markers) return;
  markers.innerHTML='';
  CHAPTERS.forEach(function(ch){
    if(ch.time < video.duration){
      const m=document.createElement('div');
      m.className='chapter-marker';
      m.style.left=(ch.time/video.duration*100)+'%';
      m.title=ch.name+' · '+fmt(ch.time);
      m.addEventListener('click', function(e){
        e.stopPropagation();
        video.currentTime=ch.time;
      safePlay();
      });
      markers.appendChild(m);
    }
  });
}

// ===== 当前章节高亮 =====
var lastChapterIndex = -1;
function updateChapterHighlight(){
  var cur = video.currentTime;
  var activeIdx = -1;
  chapterItems.forEach(function(item, i){
    var t = parseFloat(item.dataset.time);
    var next = i < chapterItems.length-1 ? parseFloat(chapterItems[i+1].dataset.time) : Infinity;
    if(cur >= t && cur < next) activeIdx = i;
  });
  if(activeIdx !== lastChapterIndex){
    chapterItems.forEach(function(item, i){
      if(i === activeIdx){
        item.classList.add('ch-active');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      else item.classList.remove('ch-active');
    });
    lastChapterIndex = activeIdx;
  }
}

// ===== 章节预览 =====
chapterItems.forEach(function(item){
  var chName = item.querySelector('.ch-name');
  if(!chName) return;
  var preview = document.createElement('div');
  preview.className = 'ch-preview';
  var title = chName.textContent;
  var desc = item.querySelector('.ch-desc');
  var story = desc ? desc.textContent : '';
  preview.innerHTML = '<div class="preview-title">' + title + '</div><div class="preview-story">' + story + '</div>';
  item.appendChild(preview);
});

// ===== 键盘 =====
document.addEventListener('keydown', function(e){
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;

  if(e.target.classList.contains('chapter-item')){
    var items = Array.from(chapterItems);
    var idx = items.indexOf(e.target);
    if(e.key === 'ArrowDown' && idx < items.length - 1){
      e.preventDefault();
      items[idx + 1].focus();
      return;
    }
    if(e.key === 'ArrowUp' && idx > 0){
      e.preventDefault();
      items[idx - 1].focus();
      return;
    }
  }

  switch(e.key){
    case ' ': e.preventDefault(); togglePlay(); break;
    case 'ArrowLeft':  video.currentTime=Math.max(0,video.currentTime-5); break;
    case 'ArrowRight': video.currentTime=Math.min(video.duration,video.currentTime+5); break;
    case 'm': muteBtn.click(); break;
    case 'f': fsBtn.click(); break;
  }
});

// ===== 控制条 & 工具栏自动隐藏 =====
let hideTimer, yjHideTimer;
var controls = document.getElementById('controls');

function showControlsAndToolbar(){
  controls.style.opacity = '1';
  controls.style.pointerEvents = 'auto';
  if(yjToolbar) yjToolbar.classList.add('yj-toolbar-visible');
  clearTimeout(hideTimer);
  clearTimeout(yjHideTimer);
  if(!video.paused){
    hideTimer = setTimeout(function(){
      controls.style.opacity = '0';
      controls.style.pointerEvents = 'none';
    }, 3000);
    yjHideTimer = setTimeout(function(){
      if(yjToolbar) yjToolbar.classList.remove('yj-toolbar-visible');
    }, 3000);
  }
}

stage.addEventListener('mousemove', showControlsAndToolbar);
stage.addEventListener('touchstart', showControlsAndToolbar, {passive:true});

video.addEventListener('play', function(){
  clearTimeout(yjHideTimer);
  yjHideTimer = setTimeout(function(){
    if(yjToolbar) yjToolbar.classList.remove('yj-toolbar-visible');
  }, 3000);
});
video.addEventListener('pause', function(){
  clearTimeout(yjHideTimer);
  if(yjToolbar) yjToolbar.classList.add('yj-toolbar-visible');
});

// 页面加载时工具栏默认可见
if(yjToolbar) yjToolbar.classList.add('yj-toolbar-visible');
