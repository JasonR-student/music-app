let enabled = false;
let intensity = 0.5;
let lastVibrateTime = 0;
let continuousMode = false;
let continuousTimer = null;

const PATTERNS = {
  softBeat: function(str){
    return [Math.round(30 * str * intensity)];
  },
  strongBeat: function(str){
    return [Math.round(80 * str * intensity), 30, Math.round(40 * str * intensity)];
  },
  bassRumble: function(energy){
    return [Math.round(100 * energy * intensity)];
  },
  melodyFlow: function(energy){
    return [Math.round(20 * energy * intensity), 15, Math.round(20 * energy * intensity)];
  },
  climax: function(str){
    return [
      Math.round(100 * str * intensity), 20,
      Math.round(60 * str * intensity), 20,
      Math.round(80 * str * intensity)
    ];
  },
  chapterTransition: function(){
    return [Math.round(200 * intensity), 100, Math.round(150 * intensity)];
  },
  ambient: function(energy){
    return [Math.round(10 * energy * intensity)];
  }
};

function init(){
  if(!('vibrate' in navigator)){
    console.warn('[HapticEngine] Vibration API not supported');
    return false;
  }
  return true;
}

function enable(){
  if(init()){
    enabled = true;
    return true;
  }
  return false;
}

function disable(){
  enabled = false;
  stopContinuous();
  if(navigator.vibrate) navigator.vibrate(0);
}

function setIntensity(value){
  intensity = Math.max(0, Math.min(1, value));
}

function getIntensity(){ return intensity; }
function isEnabled(){ return enabled; }

function vibrate(pattern){
  if(!enabled || !navigator.vibrate) return;
  const now = Date.now();
  if(now - lastVibrateTime < 100) return;
  try {
    navigator.vibrate(pattern);
    lastVibrateTime = now;
  } catch(e){
    console.warn('[HapticEngine] Vibration failed:', e);
  }
}

function update(features){
  if(!enabled) return;
  const now = Date.now();

  if(features._chapterChanged){
    vibrate(PATTERNS.chapterTransition());
    return;
  }

  if(features.isBeat){
    if(features.volume > 0.6){
      vibrate(PATTERNS.climax(features.beat));
    } else if(features.beat > 0.3){
      vibrate(PATTERNS.strongBeat(features.beat));
    } else {
      vibrate(PATTERNS.softBeat(features.beat));
    }
    return;
  }

  if(features.bands.bass > 0.5 && now - lastVibrateTime > 500){
    vibrate(PATTERNS.bassRumble(features.bands.bass));
    return;
  }

  if(features.harmony > 0.5 && features.volume > 0.3 && now - lastVibrateTime > 300){
    vibrate(PATTERNS.melodyFlow(features.harmony * features.volume));
    return;
  }

  if(features.volume < 0.15 && now - lastVibrateTime > 1000){
    vibrate(PATTERNS.ambient(features.volume));
  }
}

function startContinuous(features){
  if(!enabled || continuousMode) return;
  continuousMode = true;

  function loop(){
    if(!continuousMode || !enabled) return;
    if(features){
      const baseDuration = 50;
      const interval = Math.max(100, 500 - features.volume * 400);
      if(features.volume > 0.1){
        const pattern = [Math.round(baseDuration * features.volume * intensity)];
        try { navigator.vibrate(pattern); } catch(e){}
      }
    }
    continuousTimer = setTimeout(loop, interval);
  }
  loop();
}

function stopContinuous(){
  continuousMode = false;
  if(continuousTimer){
    clearTimeout(continuousTimer);
    continuousTimer = null;
  }
}

function chapterTransition(){
  if(enabled) vibrate(PATTERNS.chapterTransition());
}

export const HapticEngine = {
  enable, disable, isEnabled, setIntensity, getIntensity,
  update, vibrate, chapterTransition, startContinuous, stopContinuous,
  supported: function(){ return 'vibrate' in navigator; }
};
