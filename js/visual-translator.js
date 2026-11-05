import { MainLoop } from './main-loop.js';

let canvas = null;
let ctx = null;
let W = 0, H = 0;
let DPR = 1;
let running = false;
let frameSkip = 0;

let currentFeatures = null;
let currentTheme = null;

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

const strokes = [];
let MAX_STROKES = 12;

const drops = [];
let MAX_DROPS = 80;

const glows = [];
let MAX_GLOWS = 5;

const spectrumParticles = [];
const MAX_SPECTRUM = 60;

let lastFrameTime = 0;
let avgFrameTime = 16;

const CHAPTER_THEMES = {
  '引子': {
    hue: 140, saturation: 20, lightness: 25,
    accent: '#7ab648', inkTone: 'rgba(60,80,40,',
    mood: 'serene', flowSpeed: 0.3,
    season: 'spring', timeOfDay: 'dawn'
  },
  '相爱': {
    hue: 340, saturation: 35, lightness: 30,
    accent: '#d4768a', inkTone: 'rgba(80,30,50,',
    mood: 'lyrical', flowSpeed: 0.5,
    season: 'spring', timeOfDay: 'morning'
  },
  '同窗': {
    hue: 45, saturation: 40, lightness: 35,
    accent: '#d4a843', inkTone: 'rgba(90,70,30,',
    mood: 'playful', flowSpeed: 0.8,
    season: 'summer', timeOfDay: 'noon'
  },
  '相送': {
    hue: 200, saturation: 25, lightness: 28,
    accent: '#6a9bc3', inkTone: 'rgba(40,60,80,',
    mood: 'melancholy', flowSpeed: 0.4,
    season: 'autumn', timeOfDay: 'dusk'
  },
  '抗婚': {
    hue: 0, saturation: 50, lightness: 25,
    accent: '#c43030', inkTone: 'rgba(100,20,20,',
    mood: 'dramatic', flowSpeed: 1.2,
    season: 'winter', timeOfDay: 'night'
  },
  '楼台会': {
    hue: 270, saturation: 30, lightness: 25,
    accent: '#8a6ab8', inkTone: 'rgba(50,30,80,',
    mood: 'sorrowful', flowSpeed: 0.35,
    season: 'winter', timeOfDay: 'night'
  },
  '哭灵': {
    hue: 0, saturation: 60, lightness: 20,
    accent: '#a01010', inkTone: 'rgba(80,10,10,',
    mood: 'intense', flowSpeed: 1.5,
    season: 'winter', timeOfDay: 'midnight'
  },
  '化蝶': {
    hue: 180, saturation: 30, lightness: 35,
    accent: '#5ab8a8', inkTone: 'rgba(30,70,65,',
    mood: 'ethereal', flowSpeed: 0.6,
    season: 'spring', timeOfDay: 'dawn'
  }
};

var TIME_TONES = {
  dawn:     { bg: [22, 20, 18], tint: [60, 50, 35] },
  morning:  { bg: [24, 22, 19], tint: [70, 55, 40] },
  noon:     { bg: [26, 24, 20], tint: [80, 65, 45] },
  dusk:     { bg: [20, 18, 18], tint: [55, 40, 35] },
  night:    { bg: [16, 15, 18], tint: [30, 28, 40] },
  midnight: { bg: [12, 11, 14], tint: [20, 18, 30] }
};

var SEASON_PARTICLE = {
  spring: { shape: 'petal',  gravity: -0.01, drift: 0.8, sizeMul: 1.2 },
  summer: { shape: 'rain',   gravity: 0.06,  drift: 0.2, sizeMul: 0.7 },
  autumn: { shape: 'leaf',   gravity: 0.02,  drift: 1.2, sizeMul: 1.0 },
  winter: { shape: 'snow',   gravity: -0.005, drift: 0.5, sizeMul: 0.9 }
};

const DEFAULT_THEME = {
  hue: 30, saturation: 15, lightness: 22,
  accent: '#b8935a', inkTone: 'rgba(50,40,30,',
  mood: 'neutral', flowSpeed: 0.5
};

function init(canvasEl){
  canvas = canvasEl;
  ctx = canvas.getContext('2d', { alpha: false });
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  resize();
  window.addEventListener('resize', resize);

  if(window.ResizeObserver && canvas.parentElement){
    var ro = new ResizeObserver(function(){ resize(); });
    ro.observe(canvas.parentElement);
  }
}

function resize(){
  if(!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if(rect.width === 0 || rect.height === 0) return;
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
  MainLoop.register('visual-translator', function(){
    if(!running) return;
    if(currentFeatures && !currentFeatures.isBeat && currentFeatures.flux < 0.1){
      if(++frameSkip % 2 === 0) return;
    } else {
      frameSkip = 0;
    }
    render();
  }, 2);
}

function stop(){
  running = false;
  MainLoop.unregister('visual-translator');
}

function render(){
  if(!currentFeatures) return;

  var now = performance.now();
  if(lastFrameTime > 0){
    var dt = now - lastFrameTime;
    avgFrameTime = avgFrameTime * 0.9 + dt * 0.1;
    if(avgFrameTime > 22){
      MAX_DROPS = Math.max(20, MAX_DROPS - 2);
      MAX_STROKES = Math.max(4, MAX_STROKES - 1);
      MAX_GLOWS = Math.max(2, MAX_GLOWS - 1);
    } else if(avgFrameTime < 18){
      MAX_DROPS = Math.min(80, MAX_DROPS + 1);
      MAX_STROKES = Math.min(12, MAX_STROKES + 1);
      MAX_GLOWS = Math.min(5, MAX_GLOWS + 1);
    }
  }
  lastFrameTime = now;

  const f = currentFeatures;
  const theme = currentTheme || DEFAULT_THEME;

  updateVisualState(f, theme);
  clearCanvas();
  renderBackgroundWash(f, theme);
  renderInkWash(f, theme);
  renderStrokes(f, theme);
  renderDrops(f, theme);
  renderGlows(f, theme);
  renderMelodyLine(f, theme);
  renderSpectrumParticles(f, theme);
}

function updateVisualState(f, theme){
  const lerpRate = 0.18;
  visualState.hue = lerp(visualState.hue, theme.hue + f.brightness * 20 - 10, lerpRate);
  visualState.saturation = lerp(visualState.saturation, theme.saturation + f.harmony * 15, lerpRate);
  visualState.lightness = lerp(visualState.lightness, theme.lightness + f.volume * 15, lerpRate);
  visualState.particleCount = lerp(visualState.particleCount, 15 + f.volume * 60, lerpRate);

  const bpmFactor = f.bpm > 0 ? Math.min(f.bpm / 160, 1.5) : 0.5;
  visualState.strokeSpeed = lerp(visualState.strokeSpeed, theme.flowSpeed * (0.5 + f.volume) * bpmFactor, lerpRate);
  visualState.glowIntensity = lerp(visualState.glowIntensity, 0.2 + f.beat * 0.6 + f.volume * 0.2, lerpRate * 2);
  visualState.inkDensity = lerp(visualState.inkDensity, 0.3 + f.volume * 0.4 + f.bands.bass * 0.3, lerpRate);
  visualState.flowAmplitude = lerp(visualState.flowAmplitude, 0.5 + f.flux * 2 + f.beat * 0.5, lerpRate);
}

function clearCanvas(){
  var isDark = document.body.classList.contains('dark-mode');
  var tone = (currentTheme && TIME_TONES[currentTheme.timeOfDay]) || TIME_TONES.night;
  var bg = tone.bg;
  if(isDark){
    bg = [Math.max(0, bg[0] - 8), Math.max(0, bg[1] - 8), Math.max(0, bg[2] - 6)];
  }
  ctx.fillStyle = 'rgba(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ', 0.15)';
  ctx.fillRect(0, 0, W, H);
}

function renderBackgroundWash(f, theme){
  var tone = TIME_TONES[theme.timeOfDay] || TIME_TONES.night;
  var tint = tone.tint;
  const cx = W * 0.5 + Math.sin(Date.now() * 0.0003) * W * 0.15;
  const cy = H * 0.5 + Math.cos(Date.now() * 0.0004) * H * 0.1;
  const radius = Math.max(W, H) * (0.3 + f.volume * 0.3);

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const alpha = 0.05 + f.volume * 0.08;
  grad.addColorStop(0, 'rgba(' + tint[0] + ',' + tint[1] + ',' + tint[2] + ',' + (alpha * 1.5) + ')');
  grad.addColorStop(0.5, theme.inkTone + (alpha * 0.5) + ')');
  grad.addColorStop(1, 'rgba(' + tone.bg[0] + ',' + tone.bg[1] + ',' + tone.bg[2] + ',0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function renderInkWash(f, theme){
  var now = Date.now() * 0.001;
  var tone = TIME_TONES[theme.timeOfDay] || TIME_TONES.night;
  var tint = tone.tint;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  var layers = 3;
  for(var l = 0; l < layers; l++){
    var phase = l * 2.1;
    var speed = 0.3 + l * 0.15;
    var amplitude = 30 + f.volume * 60 + l * 20;
    var freq = 0.003 + l * 0.002;
    var alpha = (0.03 + f.volume * 0.05) * (1 - l * 0.25);

    ctx.beginPath();
    ctx.moveTo(0, H);

    var step = 8;
    for(var x = 0; x <= W; x += step){
          var y1 = Math.sin(x * freq + now * speed + phase) * amplitude;
          var y2 = Math.sin(x * freq * 1.7 + now * speed * 0.6 + phase * 2) * amplitude * 0.5;
          var y3 = Math.cos(x * freq * 0.5 + now * speed * 1.3) * amplitude * 0.3 * f.flux;
          var baseY = H * (0.3 + l * 0.15);
          var y = baseY + y1 + y2 + y3;
          ctx.lineTo(x, y);
        }

    ctx.lineTo(W, H);
    ctx.closePath();

    var washHue = visualState.hue + l * 15;
    ctx.fillStyle = 'hsla(' + washHue + ',' + (visualState.saturation + 5) + '%,' + (tint[2] + l * 5) + '%,' + alpha + ')';
    ctx.fill();
  }

  ctx.restore();
}

function renderStrokes(f, theme){
  const now = Date.now();

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

  for(let i = strokes.length - 1; i >= 0; i--){
    const s = strokes[i];
    s.x += + s.speed;
    s.life -= s.decay;

    if(s.life <= 0 || s.x > W + 50){
      strokes[i] = strokes[strokes.length - 1];
      strokes.pop();
      continue;
    }

    const waveY = s.y + Math.sin(s.x * s.waveFreq + s.phase + now * 0.002) * s.waveAmp;
    s.points.push({x: s.x, y: waveY});

    if(s.points.length > 60) s.points.shift();

    if(s.points.length < 2) continue;

    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);

    for(let j = 1; j < s.points.length; j++){
      const p = s.points[j];
      const prevP = s.points[j-1];
      const cpx = (prevP.x + p.x) / 2;
      const cpy = (prevP.y + p.y) / 2;
      ctx.qualCurveTo(prevP.x, prevP.y, cpx, cpy);
    }

    const strokeAlpha = s.alpha * s.life;
    ctx.strokeStyle = 'hsla(' + s.hue + ',' + visualState.saturation + '%,' + visualState.lightness + '%,' + strokeAlpha + ')';
    ctx.lineWidth = s.thickness * s.life;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
  var now = Date.now();
  var sp = SEASON_PARTICLE[theme.season] || SEASON_PARTICLE.winter;

  if(f.isBeat || f.beat > 0.5){
    var count = Math.floor(3 + f.beat * 8);
    for(var i = 0; i < count && drops.length < MAX_DROPS; i++){
      var cx = W * (0.2 + Math.random() * 0.6);
      var cy = H * (0.2 + f.pitch * 0.6);
      var angle = Math.random() * Math.PI * 2;
      var speed = (0.5 + f.beat * 3 * Math.random()) * sp.drift;
      drops.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        r: (1 + Math.random() * 3 + f.volume * 2) * sp.sizeMul,
        alpha: 0.4 + f.beat * 0.4,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        hue: visualState.hue + (Math.random() - 0.5) * 40,
        gravity: sp.gravity + f.bands.sub * 0.03,
        shape: sp.shape,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1
      });
    }
  }

  if(drops.length < visualState.particleCount && Math.random() < 0.3){
    drops.push({
      x: Math.random() * W,
      y: theme.season === 'summer' ? -10 : Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3 * sp.drift,
      vy: theme.season === 'summer' ? 2 + Math.random() * 3 : (Math.random() - 0.5) * 0.3 - 0.1,
      r: (0.5 + Math.random() * 2) * sp.sizeMul,
      alpha: 0.1 + f.volume * 0.2,
      life: 1,
      decay: 0.003 + Math.random() * 0.005,
      hue: visualState.hue,
      gravity: sp.gravity,
      shape: sp.shape,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.05
    });
  }

  for(var i = drops.length - 1; i >= 0; i--){
    var d = drops[i];
    d.x += d.vx;
    d.y += d.vy;
    d.vy += d.gravity;
    d.vx *= 0.98;
    d.vy *= 0.98;
    d.rot += d.rotSpeed;
    d.life -= d.decay;

    if(d.life <= 0){
      drops[i] = drops[drops.length - 1];
      drops.pop();
      continue;
    }

    var alpha = d.alpha * d.life;
    ctx.fillStyle = 'hsla(' + d.hue + ',' + visualState.saturation + '%,' + (visualState.lightness + 10) + '%,' + alpha + ')';

    var shape = d.shape || 'rain';
    var sz = d.r * d.life;

    if(shape === 'petal'){
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 1.5, sz * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if(shape === 'leaf'){
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 1.2, sz * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if(shape === 'snow'){
      ctx.beginPath();
      ctx.arc(d.x, d.y, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(d.x, d.y, sz * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + d.hue + ',' + visualState.saturation + '%,' + (visualState.lightness + 20) + '%,' + (alpha * 0.15) + ')';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(d.x, d.y, sz * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if(d.r > 2 && d.life > 0.5 && shape !== 'snow'){
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * (2 - d.life) * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + d.hue + ',' + visualState.saturation + '%,' + visualState.lightness + '%,' + (alpha * 0.2) + ')';
      ctx.fill();
    }
  }
}

function renderGlows(f, theme){
  const now = Date.now();

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

    g.x += Math.sin(now * 0.0005 + g.phase) * 0.3;
    g.y += Math.cos(now * 0.0004 + g.phase) * 0.2;

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
  const y = H * (0.8 - f.pitch * 0.6);
  const alpha = 0.05 + f.harmony * 0.15;
  const width = 1 + f.volume * 2;

  ctx.beginPath();
  ctx.moveTo(0, y);

  const now = Date.now();
  const segments = 50;
  for(let i = 1; i <= segments; i++){
    const x = (W / segments) * i;
    const wave = Math.sin(x * 0.02 + now * 0.003 * visualState.strokeSpeed) * (5 + f.flux * 20);
    const pitchWave = Math.sin(x * 0.005 + f.pitch * Math.PI) * (10 + f.volume * 15);
    ctx.lineTo(x, y + wave + pitchWave);
  }

  ctx.strokeStyle = theme.accent ? hexToRgba(theme.accent, alpha) : 'hsla(' + visualState.hue + ',50%,60%,' + alpha + ')';
  ctx.lineWidth = width;
  ctx.stroke();
}

function renderSpectrumParticles(f, theme){
  var now = Date.now();

  if(f.bands.sub > 0.3 || f.bands.bass > 0.4){
    var bassEnergy = f.bands.sub * 0.6 + f.bands.bass * 0.4;
    if(spectrumParticles.length < MAX_SPECTRUM && Math.random() < bassEnergy * 0.5){
      spectrumParticles.push({
        x: W * (0.1 + Math.random() * 0.8),
        y: H + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(1 + bassEnergy * 3),
        r: 3 + bassEnergy * 6,
        alpha: 0.3 + bassEnergy * 0.4,
        life: 1,
        decay: 0.005 + Math.random() * 0.005,
        hue: visualState.hue - 20,
        type: 'bass'
      });
    }
  }

  if(f.bands.lowMid > 0.2 || f.bands.mid > 0.3){
    var midEnergy = f.bands.lowMid * 0.4 + f.bands.mid * 0.6;
    if(spectrumParticles.length < MAX_SPECTRUM && Math.random() < midEnergy * 0.4){
      var fromLeft = Math.random() > 0.5;
      spectrumParticles.push({
        x: fromLeft ? -10 : W + 10,
        y: H * (0.2 + Math.random() * 0.6),
        vx: (fromLeft ? 1 : -1) * (1 + midEnergy * 2),
        vy: (Math.random() - 0.5) * 0.5,
        r: 1.5 + midEnergy * 2,
        alpha: 0.2 + midEnergy * 0.3,
        life: 1,
        decay: 0.004 + Math.random() * 0.004,
        hue: visualState.hue,
        type: 'mid'
      });
    }
  }

  if(f.bands.highMid > 0.3 || f.bands.high > 0.2){
    var highEnergy = f.bands.highMid * 0.5 + f.bands.high * 0.5;
    if(spectrumParticles.length < MAX_SPECTRUM && Math.random() < highEnergy * 0.6){
      var cx = W * (0.2 + Math.random() * 0.6);
      var cy = H * (0.1 + f.brightness * 0.5);
      var angle = Math.random() * Math.PI * 2;
      spectrumParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * (1 + highEnergy * 4),
        vy: Math.sin(angle) * (1 + highEnergy * 4),
        r: 0.5 + Math.random() * 1.5,
        alpha: 0.3 + highEnergy * 0.5,
        life: 1,
        decay: 0.01 + Math.random() * 0.015,
        hue: visualState.hue + 30,
        type: 'high'
      });
    }
  }

  for(var i = spectrumParticles.length - 1; i >= 0; i--){
    var p = spectrumParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    if(p.type === 'bass'){
      p.vy *= 0.98;
      p.vx += Math.sin(now * 0.003 + p.x * 0.01) * 0.05;
    } else if(p.type === 'mid'){
      p.vy += Math.sin(now * 0.005 + p.x * 0.02) * 0.1;
    } else {
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

    if(p.life <= 0 || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50){
      spectrumParticles[i] = spectrumParticles[spectrumParticles.length - 1];
      spectrumParticles.pop();
      continue;
    }

    var alpha = p.alpha * p.life;
    ctx.beginPath();

    if(p.type === 'mid'){
      ctx.save();
      ctx.translate(p.x, p.y);
      var angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.ellipse(0, 0, p.r * 3 * p.life, p.r * 0.5 * p.life, 0, 0, Math.PI * 2);
      ctx.restore();
    } else {
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    }

    ctx.fillStyle = 'hsla(' + p.hue + ',' + (visualState.saturation + 10) + '%,' + (visualState.lightness + 15) + '%,' + alpha + ')';
    ctx.fill();
  }
}

function hexToRgba(hex, alpha){
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function lerp(a, b, t){
  return a + (b - a) * t;
}

export const VisualTranslator = {
  init, start, stop, update, resize, setChapter,
  getCanvas: function(){ return canvas; },
  getVisualState: function(){ return Object.assign({}, visualState); },
  isRunning: function(){ return running; }
};
