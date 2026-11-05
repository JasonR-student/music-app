// ===================================================
// 「乐见」音频分析 Web Worker
// 将 FFT 特征提取、节拍检测等 CPU 密集计算移至后台线程
// 主线程通过 postMessage 发送频域/时域数据
// ===================================================
'use strict';

var sampleRate = 44100;
var binCount = 1024;
var binWidth = 0;

var SMOOTH = 0.35;
var prevFeatures = null;
var prevSpectrum = null;

var ENERGY_HISTORY_SIZE = 43;
var energyHistory = [];
var lastBeatTime = 0;
var beatIntervals = [];
var currentBPM = 0;

var SUBBANDS = [
  { name: 'sub',     low: 0,    high: 20   },
  { name: 'bass',    low: 20,   high: 80   },
  { name: 'lowMid',  low: 80,   high: 300  },
  { name: 'mid',     low: 300,  high: 2000 },
  { name: 'highMid', low: 2000, high: 6000 },
  { name: 'high',    low: 6000, high: 20000 }
];

self.onmessage = function(e){
  var msg = e.data;
  if(msg.type === 'init'){
    sampleRate = msg.sampleRate;
    binCount = msg.binCount;
    binWidth = sampleRate / (binCount * 2);
    return;
  }
  if(msg.type === 'analyze'){
    var freqData = msg.freqData;
    var timeData = msg.timeData;
    var now = msg.timestamp;

    var features = extractFeatures(freqData, timeData, now);
    var smoothed = smoothFeatures(features);
    prevFeatures = smoothed;

    self.postMessage({ type: 'features', features: smoothed });
  }
};

function extractFeatures(freqData, timeData, now){
  var rmsSum = 0;
  for(var i = 0; i < timeData.length; i++){
    var val = (timeData[i] - 128) / 128;
    rmsSum += val * val;
  }
  var rms = Math.sqrt(rmsSum / timeData.length);

  var weightedSum = 0;
  var totalEnergy = 0;
  for(var i = 0; i < freqData.length; i++){
    var energy = freqData[i];
    var freq = i * binWidth;
    weightedSum += freq * energy;
    totalEnergy += energy;
  }
  var spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;

  var rollSum = 0;
  var rollTarget = totalEnergy * 0.85;
  var spectralRolloff = 0;
  for(var i = 0; i < freqData.length; i++){
    rollSum += freqData[i];
    if(rollSum >= rollTarget){
      spectralRolloff = i * binWidth;
      break;
    }
  }

  var logSum = 0;
  var linSum = 0;
  var count = 0;
  for(var i = 1; i < freqData.length; i++){
    if(freqData[i] > 0){
      logSum += Math.log(freqData[i]);
      linSum += freqData[i];
      count++;
    }
  }
  var spectralFlatness = count > 0
    ? Math.exp(logSum / count) / (linSum / count)
    : 0;

  var dominantFreq = findDominantFrequency(freqData);

  var subbandEnergy = {};
  for(var b = 0; b < SUBBANDS.length; b++){
    var band = SUBBANDS[b];
    var sum = 0;
    var cnt = 0;
    var lowBin = Math.floor(band.low / binWidth);
    var highBin = Math.min(Math.ceil(band.high / binWidth), freqData.length - 1);
    for(var i = lowBin; i <= highBin; i++){
      sum += freqData[i];
      cnt++;
    }
    subbandEnergy[band.name] = cnt > 0 ? (sum / cnt) / 255 : 0;
  }

  var isBeat = detectBeat(rms, now);
  var flux = computeSpectralFlux(freqData);

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
    timestamp: now
  };
}

function findDominantFrequency(freqData){
  var lowBin = Math.max(1, Math.floor(60 / binWidth));
  var highBin = Math.min(freqData.length - 1, Math.ceil(2000 / binWidth));

  var maxVal = 0;
  var maxBin = lowBin;
  for(var i = lowBin; i <= highBin; i++){
    if(freqData[i] > maxVal){
      maxVal = freqData[i];
      maxBin = i;
    }
  }

  if(maxBin > 0 && maxBin < freqData.length - 1){
    var alpha = freqData[maxBin - 1];
    var beta = freqData[maxBin];
    var gamma = freqData[maxBin + 1];
    var p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
    return (maxBin + p) * binWidth;
  }

  return maxBin * binWidth;
}

function detectBeat(rms, now){
  energyHistory.push(rms);
  if(energyHistory.length > ENERGY_HISTORY_SIZE){
    energyHistory.shift();
  }

  if(energyHistory.length < ENERGY_HISTORY_SIZE) return false;

  var sum = 0;
  for(var i = 0; i < energyHistory.length; i++) sum += energyHistory[i];
  var mean = sum / energyHistory.length;

  var varSum = 0;
  for(var i = 0; i < energyHistory.length; i++){
    var diff = energyHistory[i] - mean;
    varSum += diff * diff;
  }
  var stdDev = Math.sqrt(varSum / energyHistory.length);

  var threshold = 1.4;
  var isBeat = rms > mean + threshold * stdDev && (now - lastBeatTime) > 200;

  if(isBeat){
    if(lastBeatTime > 0){
      var interval = now - lastBeatTime;
      if(interval > 250 && interval < 2000){
        beatIntervals.push(interval);
        if(beatIntervals.length > 8) beatIntervals.shift();

        if(beatIntervals.length >= 3){
          var avgInterval = 0;
          for(var i = 0; i < beatIntervals.length; i++) avgInterval += beatIntervals[i];
          avgInterval /= beatIntervals.length;
          currentBPM = 60000 / avgInterval;
        }
      }
    }
    lastBeatTime = now;
  }

  return isBeat;
}

function computeSpectralFlux(freqData){
  if(!prevSpectrum){
    prevSpectrum = new Float32Array(freqData.length);
    for(var i = 0; i < freqData.length; i++) prevSpectrum[i] = freqData[i];
    return 0;
  }

  var flux = 0;
  for(var i = 0; i < freqData.length; i++){
    var diff = freqData[i] - prevSpectrum[i];
    if(diff > 0) flux += diff;
    prevSpectrum[i] = freqData[i];
  }

  return flux / (freqData.length * 255);
}

function smoothFeatures(features){
  if(!prevFeatures) return normalizeFeatures(features);

  var result = {};
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
  for(var key in features.subbandEnergy){
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
    volume: clamp(f.rms / 0.25, 0, 1),
    pitch: clamp((freqToMidi(f.dominantFreq) - 36) / 60, 0, 1),
    brightness: clamp((f.spectralCentroid - 200) / 7800, 0, 1),
    harmony: clamp(1 - f.spectralFlatness * 10, 0, 1),
    beat: f.beatStrength || 0,
    isBeat: f.isBeat,
    bpm: f.bpm || 0,
    flux: clamp(f.spectralFlux * 5, 0, 1),
    bands: {
      sub:     clamp(f.subbandEnergy.sub || 0, 0, 1),
      bass:    clamp(f.subbandEnergy.bass || 0, 0, 1),
      lowMid:  clamp(f.subbandEnergy.lowMid || 0, 0, 1),
      mid:     clamp(f.subbandEnergy.mid || 0, 0, 1),
      highMid: clamp(f.subbandEnergy.highMid || 0, 0, 1),
      high:    clamp(f.subbandEnergy.high || 0, 0, 1)
    },
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
