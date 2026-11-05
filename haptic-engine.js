// ===================================================
// 「乐见」触觉反馈引擎
// 基于 Web Vibration API 将音乐节奏转化为触觉体验
// ===================================================
(function(){
  'use strict';

  const HapticEngine = (function(){

    let enabled = false;
    let intensity = 0.5; // 0-1
    let lastVibrateTime = 0;
    let continuousMode = false;
    let continuousTimer = null;

    // 触觉模式定义
    const PATTERNS = {
      // 轻柔节拍（弱拍）
      softBeat: function(str){
        return [Math.round(30 * str * intensity)];
      },
      // 强节拍（重拍/高潮）
      strongBeat: function(str){
        return [Math.round(80 * str * intensity), 30, Math.round(40 * str * intensity)];
      },
      // 持续低音（低频段能量高）
      bassRumble: function(energy){
        return [Math.round(100 * energy * intensity)];
      },
      // 旋律流动（中频段为主）
      melodyFlow: function(energy){
        return [Math.round(20 * energy * intensity), 15, Math.round(20 * energy * intensity)];
      },
      // 高潮段落（力度+节拍同时高）
      climax: function(str){
        return [
          Math.round(100 * str * intensity), 20,
          Math.round(60 * str * intensity), 20,
          Math.round(80 * str * intensity)
        ];
      },
      // 章节转换（长振动提示）
      chapterTransition: function(){
        return [Math.round(200 * intensity), 100, Math.round(150 * intensity)];
      },
      // 轻柔环境（安静段落）
      ambient: function(energy){
        return [Math.round(10 * energy * intensity)];
      }
    };

    function init(){
      // 检测是否支持 Vibration API
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

    function getIntensity(){
      return intensity;
    }

    function isEnabled(){
      return enabled;
    }

    function vibrate(pattern){
      if(!enabled || !navigator.vibrate) return;

      const now = Date.now();
      // 限制振动频率（避免过于频繁）
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

      // 章节转换时给予特殊触觉提示
      if(features._chapterChanged){
        vibrate(PATTERNS.chapterTransition());
        return;
      }

      // 节拍检测 → 振动
      if(features.isBeat){
        if(features.volume > 0.6){
          // 强拍
          vibrate(PATTERNS.climax(features.beat));
        } else if(features.beat > 0.3){
          // 普通节拍
          vibrate(PATTERNS.strongBeat(features.beat));
        } else {
          // 弱拍
          vibrate(PATTERNS.softBeat(features.beat));
        }
        return;
      }

      // 低频能量高 → 持续隆隆感
      if(features.bands.bass > 0.5 && now - lastVibrateTime > 500){
        vibrate(PATTERNS.bassRumble(features.bands.bass));
        return;
      }

      // 旋律流动感
      if(features.harmony > 0.5 && features.volume > 0.3 && now - lastVibrateTime > 300){
        vibrate(PATTERNS.melodyFlow(features.harmony * features.volume));
        return;
      }

      // 安静段落 → 极轻微环境触觉
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
          // 根据当前音乐特征生成持续触觉
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
      if(enabled){
        vibrate(PATTERNS.chapterTransition());
      }
    }

    return {
      enable: enable,
      disable: disable,
      isEnabled: isEnabled,
      setIntensity: setIntensity,
      getIntensity: getIntensity,
      update: update,
      vibrate: vibrate,
      chapterTransition: chapterTransition,
      startContinuous: startContinuous,
      stopContinuous: stopContinuous,
      supported: function(){ return 'vibrate' in navigator; }
    };

  })();

  window.HapticEngine = HapticEngine;

})();
