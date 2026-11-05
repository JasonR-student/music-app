// ===== 播放页视频控制器 =====
(function(){
  const video = document.getElementById('video');
  if(!video) return;

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
  const yjText = yjStatus ? yjStatus.querySelector('.yj-text') : null;
  const yjDot = yjStatus ? yjStatus.querySelector('.yj-dot') : null;

  let yuejianActive = false;
  let audioInitialized = false;

  // 初始化可视化画布
  if(vizCanvas && window.VisualTranslator){
    VisualTranslator.init(vizCanvas);
  }

  // 初始化叙事引擎
  if(window.NarrativeEngine){
    NarrativeEngine.init({
      title: document.getElementById('narrativeTitle'),
      subtitle: document.getElementById('narrativeSubtitle'),
      story: document.getElementById('narrativeStory'),
      emotion: document.getElementById('narrativeEmotion')
    }, function(chapterName, narrative){
      // 章节切换回调
      if(window.VisualTranslator){
        VisualTranslator.setChapter(chapterName);
      }
      if(window.HapticEngine){
        HapticEngine.chapterTransition();
      }
    });
  }

  // 触觉按钮显示（仅移动端支持时显示）
  if(yjHaptic && window.HapticEngine && HapticEngine.supported()){
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

  // 乐见开关
  if(yjToggle){
    yjToggle.addEventListener('click', function(){
      yuejianActive = !yuejianActive;
      if(yuejianActive){
        activateYuejian();
      } else {
        deactivateYuejian();
      }
    });
  }

  function activateYuejian(){
    yjToggle.classList.add('yj-active');
    if(vizCanvas) vizCanvas.classList.add('viz-active');
    document.getElementById('narrativeOverlay').classList.add('narrative-active');

    // 初始化音频分析（需要用户交互后才能创建 AudioContext）
    if(!audioInitialized){
      MusicAnalyzer.init(video).then(function(){
        audioInitialized = true;
        startAnalysis();
      }).catch(function(e){
        console.warn('音频初始化失败:', e);
        yuejianActive = false;
        yjToggle.classList.remove('yj-active');
      });
    } else {
      startAnalysis();
    }

    if(yjText) yjText.textContent = '乐见 · 开';
    if(yjDot) yjDot.classList.add('yj-dot-active');
  }

  function deactivateYuejian(){
    yjToggle.classList.remove('yj-active');
    if(vizCanvas) vizCanvas.classList.remove('viz-active');
    document.getElementById('narrativeOverlay').classList.remove('narrative-active');

    MusicAnalyzer.stop();
    VisualTranslator.stop();
    HapticEngine.stopContinuous();

    if(yjText) yjText.textContent = '乐见 · 关';
    if(yjDot) yjDot.classList.remove('yj-dot-active');
  }

  function startAnalysis(){
    MusicAnalyzer.resumeContext();

    MusicAnalyzer.start(function(features){
      // 更新视觉翻译引擎
      VisualTranslator.update(features);
      if(!VisualTranslator.isRunning || !VisualTranslator.isRunning()){
        VisualTranslator.start();
      }

      // 更新叙事引擎
      NarrativeEngine.update(video.currentTime);

      // 更新触觉引擎
      HapticEngine.update(features);
    });

    // 设置初始章节
    if(video.currentTime >= 0){
      NarrativeEngine.update(video.currentTime);
    }
  }

  // 视频播放时恢复 AudioContext
  video.addEventListener('play', function(){
    if(yuejianActive && audioInitialized){
      MusicAnalyzer.resumeContext();
    }
  });

  // 视频暂停时停止分析
  video.addEventListener('pause', function(){
    if(yuejianActive){
      MusicAnalyzer.stop();
      VisualTranslator.stop();
      HapticEngine.stopContinuous();
    }
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
  function togglePlay(){ if(video.paused) video.play(); else video.pause(); }
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
    // 保存播放进度
    if(video.duration && video.currentTime>3){
      localStorage.setItem('liangzhu_progress', video.currentTime);
    }
    // 高亮当前章节
    updateChapterHighlight();
  });
  video.addEventListener('loadedmetadata', function(){
    timeDisp.textContent = '0:00 / '+fmt(video.duration);
    renderChapterMarkers();
    restoreProgress();
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
    if(document.fullscreenElement) document.exitFullscreen();
    else if(stage.requestFullscreen) stage.requestFullscreen();
  });

  // ===== 倍速 =====
  const SPEEDS=[0.5,0.75,1,1.25,1.5,2];
  let speedIdx=2;
  speedBtn.addEventListener('click', function(){
    speedIdx=(speedIdx+1)%SPEEDS.length;
    video.playbackRate=SPEEDS[speedIdx];
    speedLbl.textContent=SPEEDS[speedIdx]+'x';
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
          video.play();
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
    item.addEventListener('click', function(){
      const t=parseFloat(item.dataset.time);
      if(video.duration){
        video.currentTime=t;
        video.play();
      }
    });
  });

  // ===== 章节标记（进度条上的点） =====
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
          video.play();
        });
        markers.appendChild(m);
      }
    });
  }

  // ===== 当前章节高亮 =====
  function updateChapterHighlight(){
    const cur=video.currentTime;
    chapterItems.forEach(function(item, i){
      const t=parseFloat(item.dataset.time);
      const next = i<chapterItems.length-1 ? parseFloat(chapterItems[i+1].dataset.time) : Infinity;
      if(cur>=t && cur<next) item.classList.add('ch-active');
      else item.classList.remove('ch-active');
    });
  }

  // ===== 键盘 =====
  document.addEventListener('keydown', function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    switch(e.key){
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft':  video.currentTime=Math.max(0,video.currentTime-5); break;
      case 'ArrowRight': video.currentTime=Math.min(video.duration,video.currentTime+5); break;
      case 'm': muteBtn.click(); break;
      case 'f': fsBtn.click(); break;
    }
  });

  // ===== 控制条自动隐藏 =====
  let hideTimer;
  stage.addEventListener('mousemove', function(){
    document.getElementById('controls').style.opacity='1';
    clearTimeout(hideTimer);
    if(!video.paused){
      hideTimer=setTimeout(function(){
        document.getElementById('controls').style.opacity='0';
      },3000);
    }
  });
})();
