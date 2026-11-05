var callbacks = [];
var rafId = null;
var running = false;

function tick(){
  if(!running) return;
  for(var i = 0; i < callbacks.length; i++){
    callbacks[i].fn();
  }
  rafId = requestAnimationFrame(tick);
}

export function register(name, fn, priority){
  for(var i = 0; i < callbacks.length; i++){
    if(callbacks[i].name === name) return;
  }
  callbacks.push({ name: name, fn: fn, priority: priority || 0 });
  callbacks.sort(function(a, b){ return a.priority - b.priority; });
  if(!running && callbacks.length > 0){
    running = true;
    rafId = requestAnimationFrame(tick);
  }
}

export function unregister(name){
  callbacks = callbacks.filter(function(c){ return c.name !== name; });
  if(callbacks.length === 0 && running){
    running = false;
    if(rafId){
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
}

export const MainLoop = { register, unregister };
