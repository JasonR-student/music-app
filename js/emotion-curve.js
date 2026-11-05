var canvas = null;
var ctx = null;
var dataPoints = [];
var duration = 0;
var sampleInterval = 0.5;
var lastSampleTime = -1;

function init(canvasEl){
  canvas = canvasEl;
  if(!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize(){
  if(!canvas || !canvas.parentElement) return;
  var rect = canvas.parentElement.getBoundingClientRect();
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setDuration(dur){ duration = dur; }

function sample(currentTime, features){
  if(!features) return;
  if(duration <= 0) return;
  if(currentTime - lastSampleTime < sampleInterval) return;
  lastSampleTime = currentTime;

  var emotion = features.volume * 0.6 + features.brightness * 0.25 + features.beat * 0.15;
  emotion = Math.min(1, Math.max(0, emotion));

  var idx = Math.floor(currentTime / sampleInterval);
  while(dataPoints.length <= idx){
    dataPoints.push(0);
  }
  dataPoints[idx] = emotion;
}

function render(currentTime){
  if(!ctx || !canvas || duration <= 0) return;

  var w = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
  var h = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

  ctx.clearRect(0, 0, w, h);

  if(dataPoints.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(0, h);

  for(var i = 0; i < dataPoints.length; i++){
    var x = (i * sampleInterval / duration) * w;
    var y = h - dataPoints[i] * h * 0.9;
    if(i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  var lastX = ((dataPoints.length - 1) * sampleInterval / duration) * w;
  ctx.lineTo(lastX, h);
  ctx.lineTo(0, h);
  ctx.closePath();

  var grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(184, 147, 90, 0.4)');
  grad.addColorStop(1, 'rgba(184, 147, 90, 0.05)');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  for(var i = 0; i < dataPoints.length; i++){
    var x = (i * sampleInterval / duration) * w;
    var y = h - dataPoints[i] * h * 0.9;
    if(i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(184, 147, 90, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if(currentTime >= 0 && duration > 0){
    var posX = (currentTime / duration) * w;
    ctx.beginPath();
    ctx.moveTo(posX, 0);
    ctx.lineTo(posX, h);
    ctx.strokeStyle = 'rgba(212, 178, 122, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function reset(){
  dataPoints = [];
  lastSampleTime = -1;
  duration = 0;
}

export const EmotionCurve = {
  init, setDuration, sample, render, resize, reset
};
