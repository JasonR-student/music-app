import { MainLoop } from './main-loop.js';

let audioCtx = null;
let analyser = null;
let sourceNode = null;
let freqData = null;
let timeData = null;
let running = false;
let worker = null;
let userCallback = null;

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
  analyser.smoothingTimeConstant = 0.6;

  freqData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.fftSize);

  try {
    sourceNode = audioCtx.createMediaElementSource(videoEl);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  } catch(e){
    console.warn('[MusicAnalyzer] MediaElementSource 创建失败，可能已存在:', e.message);
    if(sourceNode){
      try {
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch(e2){
        console.warn('[MusicAnalyzer] 无法连接音频节点');
        return Promise.reject(e2);
      }
    } else {
      console.error('[MusicAnalyzer] 无法获取 MediaElementSource，音频分析不可用');
      return Promise.reject(e);
    }
  }

  try {
    worker = new Worker(new URL('./audio-worker.js', import.meta.url));
    worker.onmessage = function(e){
      if(e.data.type === 'features' && userCallback){
        userCallback(e.data.features);
      }
    };
    worker.postMessage({
      type: 'init',
      sampleRate: audioCtx.sampleRate,
      binCount: analyser.frequencyBinCount
    });
  } catch(e){
    console.warn('[MusicAnalyzer] Worker 创建失败，回退到主线程计算');
    worker = null;
  }

  return Promise.resolve();
}

function start(callback){
  if(running) return;
  running = true;
  userCallback = callback;

  if(worker){
    MainLoop.register('music-analyzer', function(){
      if(!running) return;
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      var fCopy = new Uint8Array(freqData);
      var tCopy = new Uint8Array(timeData);
      worker.postMessage(
        { type: 'analyze', freqData: fCopy, timeData: tCopy, timestamp: performance.now() },
        [fCopy.buffer, tCopy.buffer]
      );
    }, 1);
  } else {
    console.warn('[MusicAnalyzer] Worker 不可用，使用主线程降级模式');
    MainLoop.register('music-analyzer', function(){
      if(!running || !userCallback) return;
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      var rmsSum = 0;
      for(var i = 0; i < timeData.length; i++){
        var val = (timeData[i] - 128) / 128;
        rmsSum += val * val;
      }
      var rms = Math.sqrt(rmsSum / timeData.length);

      var weightedSum = 0;
      var totalEnergy = 0;
      var binWidth = audioCtx.sampleRate / (analyser.frequencyBinCount * 2);
      for(var i = 0; i < freqData.length; i++){
        var energy = freqData[i];
        var freq = i * binWidth;
        weightedSum += freq * energy;
        totalEnergy += energy;
      }
      var spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;

      userCallback({
        rms: rms,
        spectralCentroid: spectralCentroid,
        freqData: freqData,
        timeData: timeData
      });
    }, 1);
  }
}

function stop(){
  running = false;
  userCallback = null;
  MainLoop.unregister('music-analyzer');
}

function resumeContext(){
  if(audioCtx && audioCtx.state === 'suspended'){
    return audioCtx.resume();
  }
  return Promise.resolve();
}

export const MusicAnalyzer = {
  init, start, stop, resumeContext,
  isRunning: function(){ return running; }
};
