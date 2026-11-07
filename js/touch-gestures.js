// 移动端触摸手势 — side-effect module
var video = document.getElementById('video');
var stage = document.querySelector('.video-stage');
if(!video || !stage) throw new Error('TouchGestures: video/stage not found');

var touchStartX = 0, touchStartY = 0;
var touchStartTime = 0;
var lastTapTime = 0;
var longPressTimer = null;
var isSwiping = false;
var swipeSide = null;
var swipeStartVal = 0;
var indicator = null;
var justDoubleTapped = false;

function showIndicator(text, pct){
  if(!indicator){
    indicator = document.createElement('div');
    indicator.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:12px 24px;background:rgba(0,0,0,0.7);color:#d4b27a;font-size:16px;border-radius:8px;letter-spacing:2px;z-index:50;pointer-events:none;opacity:0;transition:opacity 0.2s;';
    stage.appendChild(indicator);
  }
  var bar = '';
  var filled = Math.round(pct * 10);
  for(var i = 0; i < 10; i++) bar += i < filled ? '█' : '░';
  indicator.textContent = text + ' ' + bar;
  indicator.style.opacity = '1';
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(function(){
    indicator.style.opacity = '0';
  }, 800);
}

function getBrightness(){
  var filter = video.style.filter || '';
  var match = filter.match(/brightness\(([^)]+)\)/);
  return match ? parseFloat(match[1]) : 1;
}

function setBrightness(val){
  val = Math.max(0.3, Math.min(2, val));
  var filter = (video.style.filter || '').replace(/brightness\([^)]+\)/, '').trim();
  video.style.filter = filter + ' brightness(' + val + ')';
}

stage.addEventListener('touchstart', function(e){
  if(e.touches.length !== 1) return;
  var touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
  isSwiping = false;
  swipeSide = touch.clientX < window.innerWidth / 2 ? 'left' : 'right';

  if(swipeSide === 'left'){
    swipeStartVal = getBrightness();
  } else {
    swipeStartVal = video.volume;
  }

  longPressTimer = setTimeout(function(){
    longPressTimer = null;
    showSpeedMenu();
  }, 600);
}, {passive: true});

stage.addEventListener('touchmove', function(e){
  if(e.touches.length !== 1) return;
  var touch = e.touches[0];
  var dx = touch.clientX - touchStartX;
  var dy = touch.clientY - touchStartY;

  if(Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)){
    isSwiping = true;
    if(longPressTimer){
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    var delta = -dy / 150;

    if(swipeSide === 'left'){
      var newVal = Math.max(0.3, Math.min(2, swipeStartVal + delta));
      setBrightness(newVal);
      showIndicator('亮度', (newVal - 0.3) / 1.7);
    } else {
      var newVol = Math.max(0, Math.min(1, swipeStartVal + delta));
      video.volume = newVol;
      showIndicator('音量', newVol);
    }
  }
}, {passive: true});

stage.addEventListener('touchend', function(e){
  if(longPressTimer){
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  if(isSwiping) return;

  var now = Date.now();
  var elapsed = now - touchStartTime;

  if(elapsed < 250){
    if(now - lastTapTime < 300){
      var side = touchStartX < window.innerWidth / 2 ? 'left' : 'right';
      if(side === 'left'){
        video.currentTime = Math.max(0, video.currentTime - 10);
        showIndicator('快退 -10s', 0.5);
      } else {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        showIndicator('快进 +10s', 0.5);
      }
      lastTapTime = 0;
      justDoubleTapped = true;
      setTimeout(function(){ justDoubleTapped = false; }, 350);
    } else {
      lastTapTime = now;
    }
  }
}, {passive: true});

function showSpeedMenu(){
  var speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  var current = video.playbackRate || 1;
  var idx = speeds.indexOf(current);
  var nextIdx = (idx + 1) % speeds.length;
  video.playbackRate = speeds[nextIdx];
  localStorage.setItem('liangzhu_speed', speeds[nextIdx]);
  showIndicator('倍速 ' + speeds[nextIdx] + 'x', speeds[nextIdx] / 2);

  var speedLbl = document.getElementById('speedLabel');
  if(speedLbl) speedLbl.textContent = speeds[nextIdx] + 'x';
}

export function isJustDoubleTapped(){ return justDoubleTapped; }
