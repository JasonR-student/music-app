// ===================================================
// 「乐见」音频特征提取引擎
// 基于 Web Audio API 实时分析音乐特征
// 输出归一化特征向量供视觉翻译引擎消费
// ===================================================
(function(){
  'use strict';

  const MusicAnalyzer = (function(){

    let audioCtx = null;
    let analyser = null;
    let sourceNode = null;
    let freqData = null;
    let timeData = null;
    let running = false;
    let rafId = null;

    // 特征平滑（指数移动平均）
    const SMOOTH = 0.7;
    let prevFeatures = null;

    // 节拍检测状态
    const ENERGY_HISTORY_SIZE = 43; // ~0.7s at 60fps
    let energyHistory = [];
    let lastBeatTime = 0;
    let beatIntervals = [];
    let currentBPM = 0;

    // 频谱子带划分（对应中国民族乐器主要频段）
    const SUBBANDS = [
      { name: 'sub',     low: 0,    high: 20   },  // 超低频（鼓/低音）
      { name: 'bass',    low: 20,   high: 80   },  // 低频（大提琴/低音鼓）
      { name: 'lowMid',  low: 80,   high: 300  },  // 低中频（二胡/人声基频）
      { name: 'mid',     low: 300,  high: 2000 },  // 中频（小提琴/笛子基频）
      { name: 'highMid', low: 2000, high: 6000 },  // 高中频（乐器泛音/打击乐）
      { name: 'high',    low: 6000, high: 20000 }  // 高频（空气感/光泽）
    ];

    function init(videoEl){
      if(audioCtx) return Promise.resolve();

      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e){
        console.warn('[MusicAnalyzer] Web Audio API not supported');
        return Promise.reject(e);
      }

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);

      try {
        sourceNode = audioCtx.createMediaElementSource(videoEl);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch(e){
        // 如果已经创建过 source，尝试直接连接
        console.warn('[MusicAnalyzer] MediaElementSource 创建失败，可能已存在:', e.message);
        // 重新创建 analyser 连接
        try {
          sourceNode.connect(analyser);
          analyser.connect(audioCtx.destination);
        } catch(e2){
          console.warn('[MusicAnalyzer] 无法连接音频节点');
        }
      }

      return Promise.resolve();
    }

    function start(callback){
      if(running) return;
      running = true;
      energyHistory = [];
      beatIntervals = [];
      prevFeatures = null;

      function loop(){
        if(!running) return;
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        const features = extractFeatures();
        const smoothed = smoothFeatures(features);
        prevFeatures = smoothed;

        if(callback) callback(smoothed);
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
    }

    function stop(){
      running = false;
      if(rafId){
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function extractFeatures(){
      const sampleRate = audioCtx.sampleRate;
      const binCount = analyser.frequencyBinCount;
      const binWidth = sampleRate / analyser.fftSize;

      // 1. RMS 能量（力度）
      let rmsSum = 0;
      for(let i = 0; i < timeData.length; i++){
        const val = (timeData[i] - 128) / 128;
        rmsSum += val * val;
      }
      const rms = Math.sqrt(rmsSum / timeData.length);

      // 2. 频谱质心（音色亮度）
      let weightedSum = 0;
      let totalEnergy = 0;
      for(let i = 0; i < binCount; i++){
        const energy = freqData[i];
        const freq = i * binWidth;
        weightedSum += freq * energy;
        totalEnergy += energy;
      }
      const spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;

      // 3. 频谱滚降点（85%能量集中在此频率以下）
      let rollSum = 0;
      const rollTarget = totalEnergy * 0.85;
      let spectralRolloff = 0;
      for(let i = 0; i < binCount; i++){
        rollSum += freqData[i];
        if(rollSum >= rollTarget){
          spectralRolloff = i * binWidth;
          break;
        }
      }

      // 4. 频谱平坦度（噪声 vs 谐波）
      let logSum = 0;
      let linSum = 0;
      let count = 0;
      for(let i = 1; i < binCount; i++){
        if(freqData[i] > 0){
          logSum += Math.log(freqData[i]);
          linSum += freqData[i];
          count++;
        }
      }
      const spectralFlatness = count > 0
        ? Math.exp(logSum / count) / (linSum / count)
        : 0;

      // 5. 主频率（基频 F0 估计 - 简化谐波积法）
      const dominantFreq = findDominantFrequency(binWidth);

      // 6. 子带能量
      const subbandEnergy = {};
      for(const band of SUBBANDS){
        let sum = 0;
        let cnt = 0;
        const lowBin = Math.floor(band.low / binWidth);
        const highBin = Math.min(Math.ceil(band.high / binWidth), binCount - 1);
        for(let i = lowBin; i <= highBin; i++){
          sum += freqData[i];
          cnt++;
        }
        subbandEnergy[band.name] = cnt > 0 ? (sum / cnt) / 255 : 0;
      }

      // 7. 节拍检测（能量通量起始检测）
      const isBeat = detectBeat(rms);

      // 8. 频谱通量（音色变化速度）
      const flux = computeSpectralFlux();

      return {
        rms: rms,
        spectralCentroid: spectralCentroid,
        spectralRolloff: spectralRolloff,
        spectralFlatness: spectralFlatness,
        dominantFreq: dominantFreq,
        subbandEnergy: subbandEnergy,
        isBeat: isBeat,
        bpm: currentBPM,
        spectralFlux: flux,
        timestamp: performance.now()
      };
    }

    function findDominantFrequency(binWidth){
      // 在基频范围内（60Hz - 2000Hz）寻找峰值
      const lowBin = Math.max(1, Math.floor(60 / binWidth));
      const highBin = Math.min(freqData.length - 1, Math.ceil(2000 / binWidth));

      let maxVal = 0;
      let maxBin = lowBin;
      for(let i = lowBin; i <= highBin; i++){
        if(freqData[i] > maxVal){
          maxVal = freqData[i];
          maxBin = i;
        }
      }

      // 抛物线插值提高精度
      if(maxBin > 0 && maxBin < freqData.length - 1){
        const alpha = freqData[maxBin - 1];
        const beta = freqData[maxBin];
        const gamma = freqData[maxBin + 1];
        const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
        return (maxBin + p) * binWidth;
      }

      return maxBin * binWidth;
    }

    function detectBeat(rms){
      const now = performance.now();

      // 计算短期能量
      energyHistory.push(rms);
      if(energyHistory.length > ENERGY_HISTORY_SIZE){
        energyHistory.shift();
      }

      if(energyHistory.length < ENERGY_HISTORY_SIZE) return false;

      // 计算平均能量和方差
      let sum = 0;
      for(let i = 0; i < energyHistory.length; i++) sum += energyHistory[i];
      const mean = sum / energyHistory.length;

      let varSum = 0;
      for(let i = 0; i < energyHistory.length; i++){
        const diff = energyHistory[i] - mean;
        varSum += diff * diff;
      }
      const variance = varSum / energyHistory.length;
      const stdDev = Math.sqrt(variance);

      // 起始检测：当前能量超过均值 + 阈值 * 标准差
      const threshold = 1.4;
      const isBeat = rms > mean + threshold * stdDev && (now - lastBeatTime) > 200;

      if(isBeat){
        if(lastBeatTime > 0){
          const interval = now - lastBeatTime;
          if(interval > 250 && interval < 2000){ // 合理节拍间隔
            beatIntervals.push(interval);
            if(beatIntervals.length > 8) beatIntervals.shift();

            // 计算 BPM
            if(beatIntervals.length >= 3){
              let avgInterval = 0;
              for(let i = 0; i < beatIntervals.length; i++) avgInterval += beatIntervals[i];
              avgInterval /= beatIntervals.length;
              currentBPM = 60000 / avgInterval;
            }
          }
        }
        lastBeatTime = now;
      }

      return isBeat;
    }

    let prevSpectrum = null;
    function computeSpectralFlux(){
      if(!prevSpectrum){
        prevSpectrum = new Float32Array(freqData.length);
        for(let i = 0; i < freqData.length; i++) prevSpectrum[i] = freqData[i];
        return 0;
      }

      let flux = 0;
      for(let i = 0; i < freqData.length; i++){
        const diff = freqData[i] - prevSpectrum[i];
        if(diff > 0) flux += diff;
        prevSpectrum[i] = freqData[i];
      }

      return flux / (freqData.length * 255); // 归一化
    }

    function smoothFeatures(features){
      if(!prevFeatures) return normalizeFeatures(features);

      const result = {};
      result.rms = lerp(prevFeatures.rms, features.rms, 1 - SMOOTH);
      result.spectralCentroid = lerp(prevFeatures.spectralCentroid, features.spectralCentroid, 1 - SMOOTH);
      result.spectralRolloff = lerp(prevFeatures.spectralRolloff, features.spectralRolloff, 1 - SMOOTH);
      result.spectralFlatness = lerp(prevFeatures.spectralFlatness, features.spectralFlatness, 1 - SMOOTH);
      result.dominantFreq = lerp(prevFeatures.dominantFreq, features.dominantFreq, 1 - SMOOTH);
      result.isBeat = features.isBeat;
      result.beatStrength = features.isBeat ? 1.0 : (prevFeatures.beatStrength || 0) * 0.7;
      result.bpm = features.bpm || prevFeatures.bpm;
      result.spectralFlux = lerp(prevFeatures.spectralFlux, features.spectralFlux, 1 - SMOOTH);
      result.timestamp = features.timestamp;

      result.subbandEnergy = {};
      for(const key in features.subbandEnergy){
        result.subbandEnergy[key] = lerp(
          prevFeatures.subbandEnergy[key] || 0,
          features.subbandEnergy[key],
          1 - SMOOTH
        );
      }

      return normalizeFeatures(result);
    }

    function normalizeFeatures(f){
      return {
        // 力度：RMS 归一化到 0-1（典型音乐 RMS 范围 0.01-0.3）
        volume: clamp(f.rms / 0.25, 0, 1),

        // 音高：主频映射到 MIDI 音符号再归一化（C2=36 到 C7=96）
        pitch: clamp((freqToMidi(f.dominantFreq) - 36) / 60, 0, 1),

        // 亮度：频谱质心归一化（200Hz-8000Hz 范围）
        brightness: clamp((f.spectralCentroid - 200) / 7800, 0, 1),

        // 谐波度：1 - 频谱平坦度（越平坦越噪声，越接近1越谐波）
        harmony: clamp(1 - f.spectralFlatness * 10, 0, 1),

        // 节拍强度
        beat: f.beatStrength || 0,
        isBeat: f.isBeat,

        // BPM
        bpm: f.bpm || 0,

        // 频谱变化速度（音色变化）
        flux: clamp(f.spectralFlux * 5, 0, 1),

        // 子带能量（6个频段）
        bands: {
          sub:     clamp(f.subbandEnergy.sub || 0, 0, 1),
          bass:    clamp(f.subbandEnergy.bass || 0, 0, 1),
          lowMid:  clamp(f.subbandEnergy.lowMid || 0, 0, 1),
          mid:     clamp(f.subbandEnergy.mid || 0, 0, 1),
          highMid: clamp(f.subbandEnergy.highMid || 0, 0, 1),
          high:    clamp(f.subbandEnergy.high || 0, 0, 1)
        },

        // 原始数据（供高级用途）
        _raw: f
      };
    }

    function freqToMidi(freq){
      if(freq <= 0) return 0;
      return 69 + 12 * Math.log2(freq / 440);
    }

    function clamp(v, min, max){
      return v < min ? min : (v > max ? max : v);
    }

    function lerp(a, b, t){
      return a + (b - a) * t;
    }

    function resumeContext(){
      if(audioCtx && audioCtx.state === 'suspended'){
        return audioCtx.resume();
      }
      return Promise.resolve();
    }

    return {
      init: init,
      start: start,
      stop: stop,
      resumeContext: resumeContext,
      isRunning: function(){ return running; }
    };

  })();

  window.MusicAnalyzer = MusicAnalyzer;

})();
