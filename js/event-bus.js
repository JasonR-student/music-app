const listeners = {};

export function on(event, fn){
  if(!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
}

export function off(event, fn){
  if(!listeners[event]) return;
  listeners[event] = listeners[event].filter(function(f){ return f !== fn; });
}

export function emit(event, data){
  if(!listeners[event]) return;
  for(var i = 0; i < listeners[event].length; i++){
    try { listeners[event][i](data); }
    catch(e){ console.warn('[EventBus] handler error for ' + event + ':', e); }
  }
}

export function once(event, fn){
  var wrapper = function(data){
    off(event, wrapper);
    fn(data);
  };
  on(event, wrapper);
}

export const EventBus = { on, off, emit, once };
