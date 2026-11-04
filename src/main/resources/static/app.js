// ===================================================
// 粒子特效引擎 + 加载动画 + 滚动动画 + 时间更新
// ===================================================
(function(){
  // ===== 加载动画 =====
  window.addEventListener('load', function(){
    const loader = document.getElementById('loader');
    if(!loader) return;
    setTimeout(function(){
      loader.classList.add('loader-hidden');
      setTimeout(function(){ loader.style.display='none'; }, 600);
    }, 800);
  });

  // ===== 日期时间（精确到秒） =====
  const dateEl = document.getElementById('navDate');
  function updateDateTime(){
    if(!dateEl) return;
    const d = new Date();
    const Y = d.getFullYear();
    const M = String(d.getMonth()+1).padStart(2,'0');
    const D = String(d.getDate()).padStart(2,'0');
    const h = String(d.getHours()).padStart(2,'0');
    const m = String(d.getMinutes()).padStart(2,'0');
    const s = String(d.getSeconds()).padStart(2,'0');
    dateEl.textContent = Y+'.'+M+'.'+D+'  '+h+':'+m+':'+s;
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // ===== 滚动揭示动画 =====
  const revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('reveal-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('reveal-in'); });
  }

  // ===== 粒子画布 =====
  const canvas = document.getElementById('inkCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let W=0, H=0, DPR=Math.min(window.devicePixelRatio||1, 2);
  function resize(){
    W=window.innerWidth; H=window.innerHeight;
    canvas.width=W*DPR; canvas.height=H*DPR;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize();
  window.addEventListener('resize', resize);

  // 背景流动墨点
  const bgParticles=[];
  const BG_COUNT = window.innerWidth<640 ? 20 : 40;
  for(let i=0;i<BG_COUNT;i++) bgParticles.push(makeBg());
  function makeBg(){
    return{
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3-0.1,
      r:Math.random()*2.5+0.8,
      alpha:Math.random()*0.15+0.05,
      hue:Math.random()<0.7?'ink':(Math.random()<0.5?'gold':'red')
    };
  }

  // 鼠标拖尾
  const trail=[];
  let mouseX=-100, mouseY=-100;
  document.addEventListener('mousemove', function(e){
    mouseX=e.clientX; mouseY=e.clientY;
    trail.push({x:mouseX, y:mouseY, life:1, r:Math.random()*2+1});
    if(trail.length>25) trail.shift();
  });

  // 爆散粒子
  const bursts=[];
  function spawnBurst(x, y, opts){
    opts=opts||{};
    const count=opts.count||28;
    const colors=opts.colors||['ink','gold','red'];
    const power=opts.power||1;
    for(let i=0;i<count;i++){
      const angle=(Math.PI*2*i/count)+Math.random()*0.3;
      const speed=(Math.random()*3+1.5)*power;
      bursts.push({
        x:x, y:y,
        vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
        r:Math.random()*3+1.2,
        life:1, decay:Math.random()*0.015+0.012,
        color:colors[Math.floor(Math.random()*colors.length)]
      });
    }
    bursts.push({x:x,y:y,vx:0,vy:0,r:2,life:1,decay:0.02,color:'ink',blob:true});
  }
  window.InkFX={spawnBurst:spawnBurst};

  function colorOf(name, a){
    if(name==='gold') return 'rgba(184,147,90,'+a+')';
    if(name==='red')  return 'rgba(168,50,46,'+a+')';
    return 'rgba(28,26,24,'+a+')';
  }

  function tick(){
    ctx.clearRect(0,0,W,H);

    // 背景墨点
    for(const p of bgParticles){
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<-10) p.x=W+10; if(p.x>W+10) p.x=-10;
      if(p.y<-10) p.y=H+10; if(p.y>H+10) p.y=-10;
      const a=p.alpha*(0.7+0.3*Math.sin(Date.now()*0.001+p.x*0.01));
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=colorOf(p.hue,a);
      ctx.fill();
    }

    // 鼠标拖尾
    for(let i=trail.length-1;i>=0;i--){
      const t=trail[i];
      t.life-=0.04;
      if(t.life<=0){trail.splice(i,1);continue;}
      ctx.beginPath();
      ctx.arc(t.x,t.y,t.r*t.life,0,Math.PI*2);
      ctx.fillStyle=colorOf('gold',t.life*0.3);
      ctx.fill();
    }

    // 爆散
    for(let i=bursts.length-1;i>=0;i--){
      const p=bursts[i];
      p.life-=p.decay;
      if(p.life<=0){bursts.splice(i,1);continue;}
      p.x+=p.vx; p.y+=p.vy;
      if(!p.blob){p.vx*=0.96; p.vy*=0.96; p.vy+=0.04;}
      else{p.r+=0.8;}
      const a=p.life*(p.blob?0.22:0.7);
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=colorOf(p.color,a);
      if(p.blob){ctx.shadowBlur=15; ctx.shadowColor=colorOf(p.color,0.3);}
      ctx.fill();
      ctx.shadowBlur=0;
    }

    requestAnimationFrame(tick);
  }
  tick();

  // 全局点击爆散
  document.addEventListener('click', function(e){
    if(e.target.tagName==='VIDEO') return;
    spawnBurst(e.clientX, e.clientY, {count:32, power:1.2, colors:['ink','gold','red']});
  });

  // 卡片特效
  document.querySelectorAll('.card').forEach(function(card){
    let hoverTimer=null;
    card.addEventListener('mouseenter', function(){
      const rect=card.getBoundingClientRect();
      hoverTimer=setInterval(function(){
        spawnBurst(
          rect.left+Math.random()*rect.width,
          rect.top+rect.height*0.3+Math.random()*rect.height*0.4,
          {count:4, power:0.5, colors:['ink','gold']}
        );
      },120);
    });
    card.addEventListener('mouseleave', function(){ clearInterval(hoverTimer); });
    card.addEventListener('click', function(e){
      const rect=card.getBoundingClientRect();
      spawnBurst(rect.left+rect.width/2, rect.top+rect.height/2, {count:50, power:1.8, colors:['ink','gold','red']});
    });
  });
})();
