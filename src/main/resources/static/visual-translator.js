// ===================================================
// 「乐见」视觉翻译引擎
// 将音频特征映射为水墨风格的多模态视觉语言
// ===================================================
(function(){
  'use strict';

  const VisualTranslator = (function(){

    let canvas = null;
    let ctx = null;
    let W = 0, H = 0;
    let DPR = 1;
    let running = false;
    let rafId = null;

    // 当前音频特征
    let currentFeatures = null;

    // 当前章节视觉主题
    let currentTheme = null;

    // 视觉状态（用于平滑过渡）
    let visualState = {
      hue: 220,
      saturation: 15,
      lightness: 20,
      particleCount: 30,
      strokeSpeed: 0.5,
      glowIntensity: 0.3,
      inkDensity: 0.4,
      flowAmplitude: 1,
      sceneAlpha: 0.6
    };

    // 笔画轨迹系统
    const strokes = [];
    const MAX_STROKES = 12;

    // 墨滴粒子系统
    const drops = [];
    const MAX_DROPS = 80;

    // 光晕层
    const glows = [];
    const MAX_GLOWS = 5;

    // 章节主题配色（与梁祝8章节对应）
    const CHAPTER_THEMES = {
      '引子': {
        hue: 140, saturation: 20, lightness: 25,
        accent: '#7ab648', inkTone: 'rgba(60,80,40,',
        mood: 'serene', flowSpeed: 0.3
      },
      '相爱': {
        hue: 340, saturation: 35, lightness: 30,
        accent: '#d4768a', inkTone: 'rgba(80,30,50,',
        mood: 'lyrical', flowSpeed: 0.5
      },
      '同窗': {
        hue: 45, saturation: 40, lightness: 35,
        accent: '#d4a843', inkTone: 'rgba(90,70,30,',
        mood: 'playful', flowSpeed: 0.8
      },
      '相送': {
        hue: 200, saturation: 25, lightness: 28,
        accent: '#6a9bc3', inkTone: 'rgba(40,60,80,',
        mood: 'melancholy', flowSpeed: 0.4
      },
      '抗婚': {
        hue: 0, saturation: 50, lightness: 25,
        accent: '#c43030', inkTone: 'rgba(100,20,20,',
        mood: 'dramatic', flowSpeed: 1.2
      },
      '楼台会': {
        hue: 270, saturation: 30, lightness: 25,
        accent: '#8a6ab8', inkTone: 'rgba(50,30,80,',
        mood: 'sorrowful', flowSpeed: 0.35
      },
      '哭灵': {
        hue: 0, saturation: 60, lightness: 20,
        accent: '#a01010', inkTone: 'rgba(80,10,10,',
        mood: 'intense', flowSpeed: 1.5
      },
      '化蝶': {
        hue: 180, saturation: 30, lightness: 35,
        accent: '#5ab8a8', inkTone: 'rgba(30,70,65,',
        mood: 'ethereal', flowSpeed: 0.6
      }
    };

    // 默认主题
    const DEFAULT_THEME = {
      hue: 30, saturation: 15, lightness: 22,
      accent: '#b8935a', inkTone: 'rgba(50,40,30,',
      mood: 'neutral', flowSpeed: 0.5
    };

    function init(canvasEl){
      canvas = canvasEl;
      ctx = canvas.getContext('2d');
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      resize();
      window.addEventListener('resize', resize);
    }

    function resize(){
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function setChapter(chapterName){
      currentTheme = CHAPTER_THEMES[chapterName] || DEFAULT_THEME;
    }

    function update(features){
      currentFeatures = features;
    }

    function start(){
      if(running) return;
      running = true;
      currentTheme = currentTheme || DEFAULT_THEME;
      renderLoop();
    }

    function stop(){
      running = false;
      if(rafId){
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function renderLoop(){
      if(!running) return;
      render();
      rafId = requestAnimationFrame(renderLoop);
    }

    function render(){
      if(!currentFeatures) return;

      const f = currentFeatures;
      const theme = currentTheme || DEFAULT_THEME;

      // 更新视觉状态（平滑插值）
      updateVisualState(f, theme);

      // 清空画布（带拖尾效果）
      clearCanvas();

      // 渲染各视觉层
      renderBackgroundWash(f, theme);
      renderStrokes(f, theme);
      renderDrops(f, theme);
      renderGlows(f, theme);
      renderMelodyLine(f, theme);
    }

    function updateVisualState(f, theme){
      const lerpRate = 0.08;

      // 色调跟随章节主题，但受亮度影响
      visualState.hue = lerp(visualState.hue, theme.hue + f.brightness * 20 - 10, lerpRate);
      visualState.saturation = lerp(visualState.saturation, theme.saturation + f.harmony * 15, lerpRate);
      visualState.lightness = lerp(visualState.lightness, theme.lightness + f.volume * 15, lerpRate);

      // 粒子数量跟随力度
      visualState.particleCount = lerp(visualState.particleCount, 15 + f.volume * 60, lerpRate);

      // 笔画速度跟随 BPM 和力度
      const bpmFactor = f.bpm > 0 ? Math.min(f.bpm / 160, 1.5) : 0.5;
      visualState.strokeSpeed = lerp(visualState.strokeSpeed, theme.flowSpeed * (0.5 + f.volume) * bpmFactor, lerpRate);

      // 光晕强度跟随节拍
      visualState.glowIntensity = lerp(visualState.glowIntensity, 0.2 + f.beat * 0.6 + f.volume * 0.2, lerpRate * 2);

      // 墨色浓度跟随力度和低频
      visualState.inkDensity = lerp(visualState.inkDensity, 0.3 + f.volume * 0.4 + f.bands.bass * 0.3, lerpRate);

      // 流动幅度
      visualState.flowAmplitude = lerp(visualState.flowAmplitude, 0.5 + f.flux * 2 + f.beat * 0.5, lerpRate);
    }

    function clearCanvas(){
      // 半透明覆盖实现拖尾
      ctx.fillStyle = 'rgba(19, 17, 16, 0.15)';
      ctx.fillRect(0, 0, W, H);
    }

    function renderBackgroundWash(f, theme){
      // 大面积水墨晕染背景
      const cx = W * 0.5 + Math.sin(Date.now() * 0.0003) * W * 0.15;
      const cy = H * 0.5 + Math.cos(Date.now() * 0.0004) * H * 0.1;
      const radius = Math.max(W, H) * (0.3 + f.volume * 0.3);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const alpha = 0.05 + f.volume * 0.08;
      grad.addColorStop(0, theme.inkTone + (alpha * 1.5) + ')');
      grad.addColorStop(0.5, theme.inkTone + (alpha * 0.5) + ')');
      grad.addColorStop(1, 'rgba(19,17,16,0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    function renderStrokes(f, theme){
      // 书法笔画：根据音高和力度生成流动笔触
      const now = Date.now();

      // 生成新笔画
      if(strokes.length < MAX_STROKES && Math.random() < 0.1 + f.beat * 0.5){
        const startY = H * (0.2 + f.pitch * 0.6);
        strokes.push({
          x: -20,
          y: startY,
          points: [{x: -20, y: startY}],
          speed: 1 + f.volume * 3 + visualState.strokeSpeed * 2,
          thickness: 1 + f.volume * 4 + f.bands.mid * 2,
          alpha: 0.3 + f.volume * 0.5,
          hue: visualState.hue + (Math.random() - 0.5) * 30,
          life: 1,
          decay: 0.003 + f.flux * 0.005,
          waveAmp: 10 + f.flux * 40,
          waveFreq: 0.01 + f.bands.highMid * 0.02,
          phase: Math.random() * Math.PI * 2
        });
      }

      // 更新和渲染笔画
      for(let i = strokes.length - 1; i >= 0; i--){
        const s = strokes[i];
        s.x += s.speed;
        s.life -= s.decay;

        if(s.life <= 0 || s.x > W + 50){
          strokes.splice(i, 1);
          continue;
        }

        // 添加新点（带波动）
        const waveY = s.y + Math.sin(s.x * s.waveFreq + s.phase + now * 0.002) * s.waveAmp;
        s.points.push({x: s.x, y: waveY});

        // 保留最近100个点
        if(s.points.length > 100) s.points.shift();

        // 绘制笔画
        if(s.points.length < 2) continue;

        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);

        for(let j = 1; j < s.points.length; j++){
          const p = s.points[j];
          const prevP = s.points[j-1];
          const cpx = (prevP.x + p.x) / 2;
          const cpy = (prevP.y + p.y) / 2;
          ctx.quadraticCurveTo(prevP.x, prevP.y, cpx, cpy);
        }

        const strokeAlpha = s.alpha * s.life;
        ctx.strokeStyle = 'hsla(' + s.hue + ',' + visualState.saturation + '%,' + visualState.lightness + '%,' + strokeAlpha + ')';
        ctx.lineWidth = s.thickness * s.life;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 飞白效果（枯笔）：在低力度时虚线化
        if(f.volume < 0.3){
          ctx.setLineDash([s.thickness * 2, s.thickness * 3]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function renderDrops(f, theme){
      // 墨滴粒子：节拍时溅射
      const now = Date.now();

      // 节拍时生成墨滴
      if(f.isBeat || f.beat > 0.5){
        const count = Math.floor(3 + f.beat * 8);
        for(let i = 0; i < count && drops.length < MAX_DROPS; i++){
          const cx = W * (0.2 + Math.random() * 0.6);
          const cy = H * (0.2 + f.pitch * 0.6);
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + f.beat * 3 * Math.random();
          drops.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            r: 1 + Math.random() * 3 + f.volume * 2,
            alpha: 0.4 + f.beat * 0.4,
            life: 1,
            decay: 0.008 + Math.random() * 0.012,
            hue: visualState.hue + (Math.random() - 0.5) * 40,
            gravity: 0.02 + f.bands.sub * 0.03
          });
        }
      }

      // 持续生成环境粒子
      if(drops.length < visualState.particleCount && Math.random() < 0.3){
        drops.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3 - 0.1,
          r: 0.5 + Math.random() * 2,
          alpha: 0.1 + f.volume * 0.2,
          life: 1,
          decay: 0.003 + Math.random() * 0.005,
          hue: visualState.hue,
          gravity: 0
        });
      }

      // 更新和渲染墨滴
      for(let i = drops.length - 1; i >= 0; i--){
        const d = drops[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vy += d.gravity;
        d.vx *= 0.98;
        d.vy *= 0.98;
        d.life -= d.decay;

        if(d.life <= 0){
          drops.splice(i, 1);
          continue;
        }

        const alpha = d.alpha * d.life;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * d.life, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + d.hue + ',' + visualState.saturation + '%,' + (visualState.lightness + 10) + '%,' + alpha + ')';
        ctx.fill();

        // 墨滴扩散效果
        if(d.r > 2 && d.life > 0.5){
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r * (2 - d.life) * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(' + d.hue + ',' + visualState.saturation + '%,' + visualState.lightness + '%,' + (alpha * 0.2) + ')';
          ctx.fill();
        }
      }
    }

    function renderGlows(f, theme){
      // 光晕层：跟随力度和节拍
      const now = Date.now();

      // 维护光晕
      while(glows.length < Math.floor(2 + f.volume * 3) && glows.length < MAX_GLOWS){
        glows.push({
          x: Math.random() * W,
          y: Math.random() * H,
          baseR: 50 + Math.random() * 100,
          phase: Math.random() * Math.PI * 2,
          speed: 0.001 + Math.random() * 0.002
        });
      }

      while(glows.length > Math.floor(2 + f.volume * 3)){
        glows.pop();
      }

      for(const g of glows){
        const pulse = 0.8 + 0.2 * Math.sin(now * g.speed + g.phase);
        const r = g.baseR * (0.5 + f.volume * 1.5) * pulse;
        const alpha = visualState.glowIntensity * 0.15 * pulse;

        // 缓慢漂移
        g.x += Math.sin(now * 0.0005 + g.phase) * 0.3;
        g.y += Math.cos(now * 0.0004 + g.phase) * 0.2;

        // 边界环绕
        if(g.x < -r) g.x = W + r;
        if(g.x > W + r) g.x = -r;
        if(g.y < -r) g.y = H + r;
        if(g.y > H + r) g.y = -r;

        const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
        grad.addColorStop(0, 'hsla(' + visualState.hue + ',' + (visualState.saturation + 20) + '%,' + (visualState.lightness + 20) + '%,' + alpha + ')');
        grad.addColorStop(0.6, 'hsla(' + visualState.hue + ',' + visualState.saturation + '%,' + visualState.lightness + '%,' + (alpha * 0.3) + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(g.x - r, g.y - r, r * 2, r * 2);
      }
    }

    function renderMelodyLine(f, theme){
      // 旋律线：根据音高绘制水平参考线
      const y = H * (0.8 - f.pitch * 0.6);
      const alpha = 0.05 + f.harmony * 0.15;
      const width = 1 + f.volume * 2;

      ctx.beginPath();
      ctx.moveTo(0, y);

      // 带波动的旋律线
      const now = Date.now();
      const segments = 50;
      for(let i = 1; i <= segments; i++){
        const x = (W / segments) * i;
        const wave = Math.sin(x * 0.02 + now * 0.003 * visualState.strokeSpeed) * (5 + f.flux * 20);
        const pitchWave = Math.sin(x * 0.005 + f.pitch * Math.PI) * (10 + f.volume * 15);
        ctx.lineTo(x, y + wave + pitchWave);
      }

      ctx.strokeStyle = theme.accent ? theme.accent.replace(')', ',' + alpha + ')').replace('rgb', 'rgba') : 'hsla(' + visualState.hue + ',50%,60%,' + alpha + ')';
      ctx.lineWidth = width;
      ctx.stroke();
    }

    // 工具函数
    function lerp(a, b, t){
      return a + (b - a) * t;
    }

    // 公共接口
    return {
      init: init,
      start: start,
      stop: stop,
      update: update,
      setChapter: setChapter,
      getCanvas: function(){ return canvas; },
      getVisualState: function(){ return Object.assign({}, visualState); },
      isRunning: function(){ return running; }
    };

  })();

  window.VisualTranslator = VisualTranslator;

})();
