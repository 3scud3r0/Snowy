'use strict';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#mountain');
const rider = $('#rider');
const keys = new Set();

const vertexSource = `
attribute vec2 position;
void main(){ gl_Position=vec4(position,0.0,1.0); }
`;

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float travel;
uniform float steer;
uniform float velocity;
uniform float airborne;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
}
float fbm(vec2 p){float f=0.0,a=.5;for(int i=0;i<5;i++){f+=a*noise(p);p=p*2.03+17.1;a*=.5;}return f;}
float terrain(vec2 p){
  float valley=abs(p.x)*.055;
  float broad=fbm(p*.075)*1.8+fbm(p*.22)*.42;
  float ridge=pow(abs(sin(p.x*.12+p.y*.035)),3.0)*.36;
  return broad+ridge+valley-1.35;
}
vec3 normalAt(vec2 p){float e=.035;float h=terrain(p);return normalize(vec3(h-terrain(p+vec2(e,0)),e,h-terrain(p+vec2(0,e))));}
float tree(vec2 p){vec2 cell=floor(p*.38);float r=hash(cell);vec2 q=fract(p*.38)-.5;return r>.83?1.0-smoothstep(.04,.13,length(q)):0.0;}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-resolution.xy)/resolution.y;
  vec3 ro=vec3(steer*2.4,3.2+airborne*.7,travel);
  vec3 rd=normalize(vec3(uv.x*.84,uv.y*.62-.34,1.28));
  rd.y-=.22;
  float t=0.0;float hit=0.0;vec3 p=ro;
  for(int i=0;i<100;i++){
    p=ro+rd*t;float d=p.y-terrain(p.xz);
    if(d<.012){hit=1.0;break;}t+=max(.035,d*.35);if(t>38.0)break;
  }
  vec3 skyTop=vec3(.035,.14,.19);vec3 skyLow=vec3(.42,.67,.70);
  float horizon=clamp(rd.y*2.2+.55,0.0,1.0);
  vec3 color=mix(skyLow,skyTop,horizon);
  float sun=pow(max(dot(rd,normalize(vec3(.42,.32,.83))),0.0),180.0);
  color+=vec3(1.0,.93,.70)*sun*1.5;
  if(hit>.5){
    vec3 n=normalAt(p.xz);vec3 light=normalize(vec3(.48,.82,-.30));
    float diff=max(dot(n,light),0.0);float sparkle=pow(max(dot(reflect(-light,n),-rd),0.0),32.0);
    float detail=fbm(p.xz*2.5);
    vec3 snow=mix(vec3(.48,.66,.68),vec3(.94,.98,.96),diff*.72+.25);
    snow*=.88+detail*.16;snow+=sparkle*vec3(.65,.85,1.0);
    float trees=tree(p.xz)*smoothstep(4.0,1.0,abs(p.x));
    snow=mix(snow,vec3(.025,.12,.11),trees*.78);
    float fog=1.0-exp(-t*.075);color=mix(snow,skyLow,fog);
  }
  float vignette=1.0-dot(uv*.38,uv*.38);color*=clamp(vignette,.45,1.0);
  float motion=velocity*.0035*noise(vec2(gl_FragCoord.x*.04,time*8.0));
  color+=vec3(.7,.9,.95)*motion*smoothstep(.3,-.7,uv.y);
  color=pow(color,vec3(.88));
  gl_FragColor=vec4(color,1.0);
}`;

class MountainRenderer {
  constructor(target) {
    this.canvas = target;
    this.gl = target.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!this.gl) throw new Error('WebGL indisponível');
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    this.program = gl.createProgram();
    gl.attachShader(this.program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(this.program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(this.program); gl.useProgram(this.program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.uniforms = Object.fromEntries(['resolution','time','travel','steer','velocity','airborne'].map((name)=>[name,gl.getUniformLocation(this.program,name)]));
    addEventListener('resize',()=>this.resize()); this.resize();
  }
  resize(){const d=Math.min(devicePixelRatio||1,1.6);this.canvas.width=innerWidth*d;this.canvas.height=innerHeight*d;this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  draw(state, now){const gl=this.gl,u=this.uniforms;gl.useProgram(this.program);gl.uniform2f(u.resolution,this.canvas.width,this.canvas.height);gl.uniform1f(u.time,now*.001);gl.uniform1f(u.travel,state.distance*.012);gl.uniform1f(u.steer,state.x/210);gl.uniform1f(u.velocity,state.speed);gl.uniform1f(u.airborne,state.airborne);gl.drawArrays(gl.TRIANGLES,0,6);}
}

class WindAudio {
  constructor(){this.enabled=false}
  toggle(){
    if(!this.context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.context=new AC();const n=this.context.sampleRate*2,b=this.context.createBuffer(1,n,this.context.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.source=this.context.createBufferSource();this.source.buffer=b;this.source.loop=true;this.filter=this.context.createBiquadFilter();this.gain=this.context.createGain();this.filter.type='lowpass';this.source.connect(this.filter).connect(this.gain).connect(this.context.destination);this.source.start()}
    this.enabled=!this.enabled;this.context.resume();this.gain.gain.setTargetAtTime(this.enabled?.12:0,this.context.currentTime,.08);$('#sound').setAttribute('aria-pressed',this.enabled);$('#sound').lastChild.textContent=this.enabled?' ON':' ÁUDIO';
  }
  update(speed,edge){if(!this.enabled)return;this.filter.frequency.setTargetAtTime(400+speed*31,this.context.currentTime,.12);this.gain.gain.setTargetAtTime(.04+speed*.003+edge*.04,this.context.currentTime,.1)}
}

class Descent {
  constructor(renderer){this.renderer=renderer;this.audio=new WindAudio();this.running=false;this.last=0;this.duration=4200;this.reset();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop)}
  reset(){this.state={distance:0,x:0,vx:0,speed:0,maxSpeed:0,flow:0,clean:100,airborne:0,vy:0,charge:0};this.milestones=new Set();this.finished=false;this.updateHud()}
  start(){this.reset();this.running=true;$('#opening').classList.add('hidden');$('#finish').classList.remove('visible');this.last=performance.now()}
  jump(){const s=this.state;if(!this.running||s.airborne>0)return;s.vy=1.25+s.charge*.9;s.airborne=.01;s.charge=0;this.callout('OLLIE','+12 FLOW');s.flow+=12}
  update(dt){
    const s=this.state,turn=(keys.has('ArrowLeft')||keys.has('KeyA')?-1:0)+(keys.has('ArrowRight')||keys.has('KeyD')?1:0),tuck=keys.has('ArrowDown');
    const surface=SnowyCore.surfaceAt(s.distance);const target=tuck?surface.maxSpeed+15:surface.maxSpeed;
    s.speed+=(target-s.speed)*dt*surface.acceleration;s.speed-=Math.abs(turn)*surface.carveDrag*dt*.28;s.maxSpeed=Math.max(s.maxSpeed,s.speed);
    s.vx+=(turn*surface.grip*2.1-s.vx*2.4)*dt;s.x+=s.vx*dt*34;s.x=Math.max(-220,Math.min(220,s.x));
    if(Math.abs(turn)>.1){s.flow+=dt*s.speed*.07}
    if(keys.has('Space')&&s.airborne===0)s.charge=Math.min(1,s.charge+dt*1.4);
    if(s.airborne>0){s.airborne+=s.vy*dt;s.vy-=2.8*dt;if(s.airborne<=0){s.airborne=0;s.vy=0;s.flow+=18;this.callout('POUSO LIMPO','+18 FLOW')}}
    s.distance+=s.speed*dt;s.speed=Math.max(0,s.speed);this.audio.update(s.speed,Math.abs(turn));
    [900,1900,3000].forEach((m,i)=>{if(s.distance>m&&!this.milestones.has(m)){this.milestones.add(m);this.callout(['GELEIRA','BOSQUE NORTE','ÚLTIMA PAREDE'][i],'LINHA CONECTADA')}});
    this.updateHud(surface);if(s.distance>=this.duration)this.finish();
  }
  updateHud(surface=SnowyCore.surfaceAt(this.state.distance)){const s=this.state,p=Math.min(1,s.distance/this.duration);$('#speed').textContent=Math.round(s.speed);$('#flow').textContent=Math.round(s.flow);$('#flow-state').textContent=SnowyCore.flowLabel(s.flow);$('#progress').style.height=`${p*100}%`;$('#altitude').textContent=`${Math.round(3842-p*2722).toLocaleString('pt-BR')} M`;$('#speed-arc').style.width=`${Math.min(100,s.speed/115*100)}%`;$('#surface').lastChild.textContent=` ${surface.name==='POWDER'?'POWDER PROFUNDO':surface.name}`;$('#speed-lines').classList.toggle('fast',s.speed>82);rider.style.left=`calc(50% + ${s.vx*12}px)`;rider.classList.toggle('air',s.airborne>0)}
  callout(a,b){const e=$('#moment');e.innerHTML=`${a}<b>${b}</b>`;e.classList.remove('show');void e.offsetWidth;e.classList.add('show')}
  finish(){this.running=false;this.finished=true;const s=this.state;$('#grade').textContent=SnowyCore.runGrade(s.flow,s.clean);$('#final-flow').textContent=Math.round(s.flow);$('#final-speed').textContent=`${Math.round(s.maxSpeed)} KM/H`;$('#final-clean').textContent=`${s.clean}%`;$('#finish').classList.add('visible')}
  loop(now){const dt=Math.min((now-this.last)/1000,.033)||0;this.last=now;if(this.running)this.update(dt);this.renderer.draw(this.state,now);requestAnimationFrame(this.loop)}
}

let renderer;
try{renderer=new MountainRenderer(canvas)}catch(error){document.body.classList.add('no-webgl');console.error(error)}
if(renderer){const game=new Descent(renderer);$('#ride').addEventListener('click',()=>game.start());$('#again').addEventListener('click',()=>game.start());$('#pause').addEventListener('click',()=>{game.running=!game.running;game.last=performance.now();$('#pause').textContent=game.running?'Ⅱ':'▶'});$('#sound').addEventListener('click',()=>game.audio.toggle());addEventListener('keydown',(e)=>{if(['ArrowLeft','ArrowRight','ArrowDown','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&game.state.airborne===0)game.state.charge=.05});addEventListener('keyup',(e)=>{keys.delete(e.code);if(e.code==='Space')game.jump()})}

let installPrompt=null;addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();installPrompt=e});
if('serviceWorker'in navigator&&location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>undefined));
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let installPrompt = null;
const installButton = $('#install-game');
addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
addEventListener('appinstalled', () => { installButton.hidden = true; });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}

const snowTypes = {
  powder: { friction: '65%', float: '91%', grip: '47%', text: 'Macia, profunda, desacelera o rider e recompensa linhas fluidas com boa flutuação.', color: '#eef5ee' },
  packed: { friction: '39%', float: '44%', grip: '82%', text: 'Previsível e rápida. Transmite pressão com clareza e sustenta carves agressivos.', color: '#c4dcda' },
  ice: { friction: '12%', float: '18%', grip: '25%', text: 'Velocidade brutal e pouca margem. Bordas precisas ou uma longa derrapagem.', color: '#80bdc7' }
};

const routes = {
  flow: { seed: 87241, duration: 5200, spacing: 1, objective: { flow: 300, clean: 70, speed: 70 } },
  speed: { seed: 44107, duration: 4600, spacing: 1.25, objective: { flow: 180, clean: 65, speed: 102 } },
  technical: { seed: 99017, duration: 5600, spacing: .72, objective: { flow: 420, clean: 82, speed: 75 } }
};

$$('.snow-selector button').forEach((button) => button.addEventListener('click', () => {
  $('.snow-selector .active').classList.remove('active');
  button.classList.add('active');
  const data = snowTypes[button.dataset.snow];
  $('#friction').style.width = data.friction;
  $('#float').style.width = data.float;
  $('#grip').style.width = data.grip;
  $('#snow-description').textContent = data.text;
  $('.snow-viz').style.setProperty('--snow', data.color);
}));
$('.snow-selector .active').click();

$$('.zones button').forEach((button) => button.addEventListener('click', () => {
  const [name, detail] = button.dataset.zone.split('|');
  $('#zone-label b').textContent = name;
  $('#zone-label span').textContent = detail;
  $$('.zones button').forEach((zone) => zone.classList.remove('selected'));
  button.classList.add('selected');
}));

class MountainAudio {
  constructor() {
    this.context = null;
    this.enabled = false;
  }

  enable() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);

      const bufferSize = this.context.sampleRate * 2;
      const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) samples[i] = Math.random() * 2 - 1;
      this.wind = this.context.createBufferSource();
      this.wind.buffer = buffer;
      this.wind.loop = true;
      this.windFilter = this.context.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windGain = this.context.createGain();
      this.wind.connect(this.windFilter).connect(this.windGain).connect(this.master);
      this.windGain.gain.value = 0;
      this.wind.start();
    }
    this.context.resume();
    this.enabled = true;
    return true;
  }

  disable() {
    if (!this.context) return;
    this.enabled = false;
    this.windGain.gain.setTargetAtTime(0, this.context.currentTime, 0.04);
  }

  setIntensity(speed, edge) {
    if (!this.enabled) return;
    const now = this.context.currentTime;
    this.windGain.gain.setTargetAtTime(0.08 + speed * 0.7 + edge * 0.15, now, 0.08);
    this.windFilter.frequency.setTargetAtTime(350 + speed * 3400, now, 0.1);
  }

  impact(crash) {
    if (!this.enabled) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = crash ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(crash ? 82 : 145, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(42, this.context.currentTime + 0.18);
    gain.gain.setValueAtTime(crash ? 0.28 : 0.12, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.22);
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.24);
  }
}

class SnowyRun {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.keys = new Set();
    this.running = false;
    this.lastTime = 0;
    this.duration = 5200;
    this.seed = 87241;
    this.best = Number(localStorage.getItem('snowy-best') || 0);
    this.ride = 'snowboard';
    this.route = 'flow';
    this.weather = 'clear';
    this.paused = false;
    this.replaying = false;
    this.replayPlaying = false;
    this.replaySpeed = 1;
    this.replayCamera = 'chase';
    this.replayCursor = 0;
    this.lastReplay = [];
    this.ghostReplay = [];
    this.audio = new MountainAudio();
    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    this.bindControls();
    this.reset();
    this.resize();
    this.render();
  }

  random() {
    const result = SnowyCore.seededRandom(this.seed);
    this.seed = result.seed;
    return result.value;
  }

  reset() {
    const route = routes[this.route];
    this.seed = route.seed;
    this.duration = route.duration;
    this.state = {
      x: 0, lateralVelocity: 0, speed: 46, maxSpeed: 46, distance: 0,
      altitude: 0, verticalVelocity: 0, grounded: true, charge: 0,
      rotation: 0, angularVelocity: 0, flow: 0, combo: 0, clean: 100,
      crashed: 0, elapsed: 0, surface: 'powder', cameraShake: 0,
      nearMisses: 0, airtime: 0, rotations: 0, longestCombo: 0, butterTime: 0, grabTime: 0
    };
    this.objects = [];
    for (let z = 380; z < this.duration + 900; z += (115 + this.random() * 140) * route.spacing) {
      const roll = this.random();
      this.objects.push({
        z,
        x: (this.random() - .5) * 980,
        type: roll > .82 ? 'ramp' : roll > .58 ? 'rock' : 'tree',
        variant: this.random(),
        passed: false
      });
    }
    this.particles = [];
    this.tracks = [];
    this.recording = [];
    this.recordTimer = 0;
    this.movesUsed = new Set();
    this.updateHud();
  }

  bindControls() {
    addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.running) { this.pause(); return; }
      if (event.code === 'Escape' && this.paused) { this.resume(); return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code === 'KeyA' ? 'ArrowLeft' : event.code === 'KeyD' ? 'ArrowRight' : event.code);
      if (event.code === 'Space' && this.state.grounded) this.state.charge = Math.max(this.state.charge, .1);
    });
    addEventListener('keyup', (event) => {
      const code = event.code === 'KeyA' ? 'ArrowLeft' : event.code === 'KeyD' ? 'ArrowRight' : event.code;
      this.keys.delete(code);
      if (code === 'Space') this.ollie();
    });
    $$('.touch-controls button').forEach((button) => {
      const code = button.dataset.key;
      const down = (event) => { event.preventDefault(); this.keys.add(code); if (code === 'Space' && this.state.grounded) this.state.charge = .1; };
      const up = (event) => { event.preventDefault(); this.keys.delete(code); if (code === 'Space') this.ollie(); };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
    });
    addEventListener('resize', this.resize);
  }

  resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.width * .533 * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = rect.width;
    this.height = rect.width * .533;
    if (!this.running) this.render();
  }

  start() {
    if (this.lastReplay.length) this.ghostReplay = this.lastReplay.map((frame) => ({ ...frame }));
    this.reset();
    this.running = true;
    this.paused = false;
    this.replaying = false;
    this.lastTime = performance.now();
    $('#start-overlay').classList.add('hidden');
    $('#result-overlay').classList.remove('visible');
    this.canvas.closest('.game-wrap').focus();
    requestAnimationFrame(this.loop);
  }

  pause() {
    if (!this.running) return;
    this.paused = true;
    this.running = false;
    this.audio.setIntensity(0);
    $('#pause-overlay').classList.add('visible');
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.running = true;
    this.lastTime = performance.now();
    $('#pause-overlay').classList.remove('visible');
    requestAnimationFrame(this.loop);
  }

  ollie() {
    if (!this.running || !this.state.grounded || !this.state.charge) return;
    this.state.verticalVelocity = 270 + this.state.charge * 190;
    this.state.grounded = false;
    this.state.combo += 1;
    this.callout(this.state.charge > .65 ? 'OLLIE CARREGADO' : 'OLLIE', 8);
    this.state.charge = 0;
  }

  loop(time) {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, .034);
    this.lastTime = time;
    this.update(dt);
    this.render();
    if (this.running) requestAnimationFrame(this.loop);
  }

  update(dt) {
    const s = this.state;
    s.elapsed += dt;
    this.recordTimer += dt;
    const left = this.keys.has('ArrowLeft');
    const right = this.keys.has('ArrowRight');
    const tuck = this.keys.has('ArrowDown');
    const butter = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && s.grounded && s.speed > 28;
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    const baseSurface = this.getSurface(s.distance);
    const discipline = this.ride === 'ski' ? { grip: 1.08, drag: 0.9, speed: 1.04 } : { grip: 1, drag: 1, speed: 1 };
    const storm = this.weather === 'storm' ? { grip: 0.86, drag: 1.12, speed: 0.92 } : { grip: 1, drag: 1, speed: 1 };
    const surface = {
      ...baseSurface,
      grip: baseSurface.grip * discipline.grip * storm.grip,
      carveDrag: baseSurface.carveDrag * discipline.drag * storm.drag,
      maxSpeed: baseSurface.maxSpeed * discipline.speed * storm.speed
    };
    s.surface = surface.name;

    if (s.crashed > 0) {
      s.crashed -= dt;
      s.speed += (32 - s.speed) * dt * 2;
    } else {
      const grip = surface.grip * (s.grounded ? 1 : .18);
      s.lateralVelocity += steer * grip * dt * 260;
      s.lateralVelocity *= Math.pow(surface.damping, dt * 60);
      s.x += s.lateralVelocity * dt;
      s.x = Math.max(-540, Math.min(540, s.x));
      const targetSpeed = tuck ? surface.maxSpeed + 13 : surface.maxSpeed;
      s.speed += (targetSpeed - s.speed) * dt * surface.acceleration;
      s.speed -= Math.abs(steer) * surface.carveDrag * dt;
      s.maxSpeed = Math.max(s.maxSpeed, s.speed);
      if (Math.abs(steer) && s.grounded) s.flow += dt * (s.speed * .075);
      if (butter) {
        s.butterTime += dt;
        s.flow += dt * 7;
        s.lateralVelocity *= .985;
        this.movesUsed.add('butter');
      }
    }

    if (this.keys.has('Space') && s.grounded) s.charge = Math.min(1, s.charge + dt * 1.45);
    if (!s.grounded) {
      if (this.keys.has('KeyZ')) s.angularVelocity -= dt * 3.8;
      if (this.keys.has('KeyX')) s.angularVelocity += dt * 3.8;
      s.rotation += s.angularVelocity * dt;
      s.airtime += dt;
      if (this.keys.has('KeyC') || this.keys.has('KeyV')) {
        s.grabTime += dt;
        s.flow += dt * (5 + Math.abs(s.angularVelocity) * 2);
        this.movesUsed.add(this.keys.has('KeyC') ? 'mute-grab' : 'tail-grab');
      }
      s.altitude += s.verticalVelocity * dt;
      s.verticalVelocity -= 690 * dt;
      if (s.altitude <= 0) this.land();
    } else {
      s.rotation *= Math.pow(.001, dt);
      s.angularVelocity *= Math.pow(.02, dt);
    }

    s.distance += s.speed * dt * 1.08;
    s.cameraShake *= Math.pow(.06, dt);
    this.audio.setIntensity(s.speed / 115, Math.abs(s.lateralVelocity) / 200);
    this.spawnSnow(steer, surface);
    this.updateParticles(dt);
    this.checkObjects();
    this.updateHud();
    if (this.recordTimer >= .065) {
      this.recordTimer = 0;
      this.recording.push({ distance: s.distance, x: s.x, altitude: s.altitude, rotation: s.rotation, speed: s.speed });
    }
    if (s.distance >= this.duration) this.finish();
  }

  getSurface(distance) {
    return SnowyCore.surfaceAt(distance);
  }

  spawnSnow(steer, surface) {
    if (!this.state.grounded || this.particles.length > 150) return;
    const amount = surface.name === 'POWDER' ? 4 : steer ? 2 : 1;
    for (let i = 0; i < amount; i += 1) {
      this.particles.push({ x: this.width / 2 + (this.random() - .5) * 25, y: this.height * .79, vx: -this.state.lateralVelocity * .08 + (this.random() - .5) * 60, vy: -15 - this.random() * 60, life: .35 + this.random() * .35, size: 1 + this.random() * 4 });
    }
    if (Math.abs(steer) && this.tracks.length < 80) this.tracks.push({ x: this.state.x, z: this.state.distance, life: 1 });
  }

  updateParticles(dt) {
    this.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.life -= dt; });
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  checkObjects() {
    const s = this.state;
    this.objects.forEach((object) => {
      const dz = object.z - s.distance;
      if (object.passed || dz > 40 || dz < -35) return;
      object.passed = true;
      const gap = Math.abs(object.x - s.x);
      if (object.type === 'ramp' && gap < 85 && s.grounded) {
        s.verticalVelocity = 360 + s.speed;
        s.grounded = false;
        s.combo += 2;
        s.longestCombo = Math.max(s.longestCombo, s.combo);
        this.movesUsed.add('transition');
        this.callout('TRANSIÇÃO PERFEITA', 14);
      } else if (object.type !== 'ramp' && gap < 52 && s.altitude < 38) {
        this.crash();
      } else if (object.type !== 'ramp' && gap < 135) {
        const reward = Math.round((140 - gap) * .2 + s.speed * .1);
        s.flow += reward;
        s.combo += 1;
        s.nearMisses += 1;
        s.longestCombo = Math.max(s.longestCombo, s.combo);
        this.movesUsed.add('proximity');
        this.callout(gap < 82 ? 'RASANTE' : 'LINHA JUSTA', reward);
      }
    });
  }

  land() {
    const s = this.state;
    const landing = SnowyCore.evaluateLanding(s.rotation, s.combo);
    s.altitude = 0;
    s.verticalVelocity = 0;
    s.grounded = true;
    if (landing.clean) {
      s.flow += landing.reward;
      this.callout(landing.degrees >= 180 ? `${landing.degrees}° · POUSO LIMPO` : 'POUSO LIMPO', landing.reward);
      this.audio.impact(false);
      if (landing.degrees >= 180) {
        s.rotations += Math.max(1, Math.round(landing.degrees / 360));
        this.movesUsed.add(`${Math.round(landing.degrees / 180) * 180}`);
      }
    } else {
      this.crash();
    }
    s.combo = 0;
    s.rotation = 0;
    s.angularVelocity = 0;
  }

  crash() {
    const s = this.state;
    if (s.crashed > 0) return;
    s.crashed = 1.1;
    s.speed *= .42;
    s.flow = Math.max(0, s.flow - 35);
    s.clean = Math.max(0, s.clean - 18);
    s.cameraShake = 13;
    s.altitude = 0;
    s.grounded = true;
    this.audio.impact(true);
    this.callout('RECUPERE O RITMO', -35);
  }

  callout(text, points) {
    const element = $('#trick-callout');
    element.innerHTML = `${text}<b>${points > 0 ? '+' : ''}${points} FLOW</b>`;
    element.classList.remove('show');
    void element.offsetWidth;
    element.classList.add('show');
  }

  finish() {
    this.running = false;
    const score = Math.round(this.state.flow);
    const grade = SnowyCore.runGrade(score, this.state.clean);
    const objective = SnowyCore.evaluateObjective(this.state, routes[this.route].objective);
    const quality = SnowyCore.lineQuality({ ...this.state, uniqueMoves: this.movesUsed.size });
    this.lastReplay = this.recording.map((frame) => ({ ...frame }));
    if (score > this.best) {
      this.best = score;
      localStorage.setItem('snowy-best', score);
    }
    $('#result-grade').textContent = grade;
    $('#result-flow').textContent = score;
    $('#result-speed').textContent = `${Math.round(this.state.maxSpeed)} KM/H`;
    $('#result-clean').textContent = `${Math.round(this.state.clean)}%`;
    $('#result-status').textContent = objective.completed ? 'OBJETIVO CONCLUÍDO' : 'LINHA CONCLUÍDA';
    $('#result-status').classList.toggle('complete', objective.completed);
    $('#best-label').textContent = `MELHOR LINHA: ${this.best} · ${this.lastReplay.length} FRAMES`;
    $('#quality-bars').innerHTML = Object.entries(quality.dimensions).map(([name, value]) => `<div><span>${name}</span><i><b style="width:${Math.round(value)}%"></b></i><em>${Math.round(value)}</em></div>`).join('');
    $('#result-overlay').classList.add('visible');
  }

  replay() {
    if (!this.lastReplay.length) return;
    this.running = false;
    this.paused = false;
    this.replaying = true;
    this.replayPlaying = true;
    this.replayCursor = 0;
    $('#result-overlay').classList.remove('visible');
    $('#replay-studio').classList.add('visible');
    $('#replay-play').textContent = 'Ⅱ';
    this.replayLoop();
  }

  replayLoop() {
    if (!this.replaying) return;
    if (this.replayPlaying) this.replayCursor += this.replaySpeed;
    if (this.replayCursor >= this.lastReplay.length - 1) {
      this.replayCursor = this.lastReplay.length - 1;
      this.replayPlaying = false;
      $('#replay-play').textContent = '▶';
    }
    const frame = this.lastReplay[Math.max(0, Math.floor(this.replayCursor))];
    Object.assign(this.state, frame);
    this.state.grounded = frame.altitude <= 0;
    this.render();
    this.updateHud();
    const progress = this.lastReplay.length > 1 ? this.replayCursor / (this.lastReplay.length - 1) * 100 : 0;
    $('#replay-scrubber').value = progress;
    const seconds = Math.round(this.replayCursor * .065);
    $('#replay-time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    requestAnimationFrame(() => this.replayLoop());
  }

  closeReplay() {
    this.replaying = false;
    this.replayPlaying = false;
    $('#replay-studio').classList.remove('visible');
    $('#result-overlay').classList.add('visible');
  }

  exportLine() {
    if (!this.lastReplay.length) return;
    const payload = {
      format: 'snowy-line-v1', createdAt: new Date().toISOString(),
      route: this.route, ride: this.ride, weather: this.weather,
      summary: { flow: Math.round(this.state.flow), clean: this.state.clean, maxSpeed: Math.round(this.state.maxSpeed) },
      frames: this.lastReplay
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `snowy-${this.route}-${Date.now()}.json`; link.click();
    URL.revokeObjectURL(url);
  }

  updateHud() {
    const s = this.state;
    $('#speed').textContent = Math.round(s.speed);
    $('#game-flow').textContent = Math.round(s.flow);
    $('#surface').textContent = s.surface;
    $('#distance').textContent = `${Math.min(this.duration, Math.round(s.distance))} M`;
    $('#flow-label').textContent = SnowyCore.flowLabel(s.flow);
    $('#combo-label').textContent = `×${Math.max(1, s.combo + 1)}`;
    $('#run-progress').style.width = `${Math.min(100, s.distance / this.duration * 100)}%`;
    $('#checkpoint-label').textContent = s.distance > 3900 ? 'VALE' : s.distance > 2500 ? 'BOSQUE' : s.distance > 1100 ? 'GELEIRA' : 'CUME';
  }

  project(worldX, dz) {
    const horizon = this.height * .28;
    const scale = (this.height * .95) / (dz + 250);
    return { x: this.width / 2 + (worldX - this.state.x) * scale, y: horizon + this.height * 1.03 * scale, scale };
  }

  render() {
    if (!this.width) return;
    const ctx = this.ctx;
    const shakeX = (this.random() - .5) * this.state.cameraShake;
    const shakeY = (this.random() - .5) * this.state.cameraShake;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    if (this.replaying && this.replayCamera === 'drone') {
      ctx.translate(this.width * .08, this.height * .09); ctx.scale(.84, .84);
    } else if (this.replaying && this.replayCamera === 'side') {
      ctx.translate(-this.width * .16, -this.height * .07); ctx.scale(1.22, 1.22);
    }
    this.drawWorld();
    this.drawTracks();
    this.drawGhost();
    [...this.objects].sort((a, b) => b.z - a.z).forEach((object) => this.drawObject(object));
    this.drawParticles();
    this.drawRider();
    this.drawVignette();
    ctx.restore();
  }

  drawWorld() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#102f3b'); sky.addColorStop(.47, '#78aeb2'); sky.addColorStop(1, '#eff5f0');
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, w + 40, h + 40);
    if (this.weather === 'storm') {
      ctx.fillStyle = '#c5d5d488';
      ctx.fillRect(-20, -20, w + 40, h + 40);
    }
    ctx.fillStyle = '#e8f3db'; ctx.beginPath(); ctx.arc(w * .78, h * .13, h * .045, 0, Math.PI * 2); ctx.fill();
    this.drawRange('#83a7a8', h * .27, [0,.26,.1,.34,.05,.28,0]);
    this.drawRange('#b8cdca', h * .34, [.08,.35,.18,.42,.12,.33,.09]);
    ctx.fillStyle = this.getSurface(this.state.distance).color;
    ctx.beginPath(); ctx.moveTo(-20, h + 20); ctx.lineTo(-20, h * .33); ctx.quadraticCurveTo(w / 2, h * .20, w + 20, h * .33); ctx.lineTo(w + 20, h + 20); ctx.fill();
    const horizon = h * .28;
    for (let i = -7; i <= 7; i += 1) {
      ctx.strokeStyle = i === 0 ? '#6e9fa044' : '#789e9b22'; ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(w / 2, horizon); ctx.lineTo(w / 2 + i * w * .16, h); ctx.stroke();
    }
    for (let z = 200; z < 1700; z += 220) {
      const p = this.project(0, z); ctx.strokeStyle = '#789e9b1d'; ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(w, p.y); ctx.stroke();
    }
  }

  drawRange(color, baseline, peaks) {
    const ctx = this.ctx; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, baseline);
    peaks.forEach((peak, index) => ctx.lineTo((index / (peaks.length - 1)) * this.width, baseline - peak * this.height));
    ctx.lineTo(this.width, baseline + 70); ctx.lineTo(0, baseline + 70); ctx.fill();
  }

  drawObject(object) {
    const dz = object.z - this.state.distance;
    if (dz < 25 || dz > 1900) return;
    const p = this.project(object.x, dz);
    const ctx = this.ctx;
    if (p.x < -100 || p.x > this.width + 100) return;
    if (object.type === 'tree') {
      const height = 112 * p.scale;
      ctx.fillStyle = object.variant > .5 ? '#173e3c' : '#24514c';
      ctx.beginPath(); ctx.moveTo(p.x, p.y - height); ctx.lineTo(p.x - 38 * p.scale, p.y); ctx.lineTo(p.x + 38 * p.scale, p.y); ctx.fill();
      ctx.fillStyle = '#e9f2edbb'; ctx.beginPath(); ctx.moveTo(p.x, p.y - height * .82); ctx.lineTo(p.x - 18 * p.scale, p.y - height * .38); ctx.lineTo(p.x + 2 * p.scale, p.y - height * .45); ctx.fill();
    } else if (object.type === 'rock') {
      ctx.fillStyle = '#536d70'; ctx.beginPath(); ctx.moveTo(p.x - 25*p.scale,p.y); ctx.lineTo(p.x-15*p.scale,p.y-28*p.scale); ctx.lineTo(p.x+13*p.scale,p.y-35*p.scale); ctx.lineTo(p.x+30*p.scale,p.y); ctx.fill();
      ctx.fillStyle = '#dce9e5'; ctx.beginPath(); ctx.moveTo(p.x-15*p.scale,p.y-28*p.scale); ctx.lineTo(p.x+13*p.scale,p.y-35*p.scale); ctx.lineTo(p.x+2*p.scale,p.y-20*p.scale); ctx.fill();
    } else {
      ctx.fillStyle = '#bfd6d1'; ctx.beginPath(); ctx.moveTo(p.x-65*p.scale,p.y); ctx.lineTo(p.x+55*p.scale,p.y); ctx.lineTo(p.x+18*p.scale,p.y-34*p.scale); ctx.lineTo(p.x-42*p.scale,p.y-20*p.scale); ctx.fill();
      ctx.strokeStyle = '#84ada9'; ctx.stroke();
    }
  }

  drawTracks() {
    const ctx = this.ctx;
    this.tracks.forEach((track) => {
      const dz = track.z - this.state.distance;
      if (dz < 20 || dz > 1000) return;
      const p = this.project(track.x, dz);
      ctx.strokeStyle = '#779e9a55'; ctx.lineWidth = Math.max(1, p.scale * 3); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - this.state.lateralVelocity * p.scale * .1, p.y + 10 * p.scale); ctx.stroke();
    });
    this.tracks = this.tracks.filter((track) => track.z > this.state.distance + 10);
  }

  drawRider() {
    const ctx = this.ctx;
    const s = this.state;
    const x = this.width / 2 + s.lateralVelocity * .05;
    const y = this.height * .79 - s.altitude * .32;
    const buttering = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && s.grounded;
    const grabbing = !s.grounded && (this.keys.has('KeyC') || this.keys.has('KeyV'));
    const lean = s.crashed > 0 ? 1.25 : s.lateralVelocity * .003 + s.rotation + (buttering ? -.18 : 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(lean);
    ctx.strokeStyle = '#07131b'; ctx.lineWidth = Math.max(3, this.width / 230); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6,-31);ctx.lineTo(4,-8);ctx.lineTo(-15,14);ctx.moveTo(4,-8);ctx.lineTo(21,13);ctx.moveTo(-2,-21);ctx.lineTo(grabbing ? 18 : 19,grabbing ? 14 : -10);ctx.stroke();
    ctx.fillStyle = '#b9f542'; ctx.beginPath(); ctx.arc(-7,-40,9,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle = '#07131b';ctx.lineWidth=5;ctx.beginPath();
    if (this.ride === 'ski') {
      ctx.moveTo(-34,14);ctx.lineTo(34,18);ctx.moveTo(-30,23);ctx.lineTo(38,27);
    } else {
      ctx.moveTo(-32,18);ctx.quadraticCurveTo(0,23,34,17);
    }
    ctx.stroke();ctx.restore();
    if (s.charge) { ctx.strokeStyle='#b9f542';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y+31,25,-Math.PI/2,-Math.PI/2+Math.PI*2*s.charge);ctx.stroke(); }
  }

  drawGhost() {
    if (!this.running || !this.ghostReplay.length) return;
    let closest = this.ghostReplay[0];
    for (let i = 1; i < this.ghostReplay.length; i += 1) {
      if (Math.abs(this.ghostReplay[i].distance - this.state.distance) < Math.abs(closest.distance - this.state.distance)) closest = this.ghostReplay[i];
    }
    if (Math.abs(closest.distance - this.state.distance) > 90) return;
    const x = this.width / 2 + (closest.x - this.state.x) * .22;
    const y = this.height * .79 - closest.altitude * .32;
    const ctx = this.ctx;
    ctx.save(); ctx.globalAlpha = .28; ctx.translate(x, y); ctx.rotate(closest.rotation);
    ctx.strokeStyle = '#b9f542'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-25,18); ctx.lineTo(28,18); ctx.moveTo(0,-35);ctx.lineTo(0,12);ctx.stroke();ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx; ctx.fillStyle = '#f7fffd';
    this.particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, particle.life * 1.8); ctx.beginPath(); ctx.arc(particle.x,particle.y,particle.size,0,Math.PI*2);ctx.fill(); });
    ctx.globalAlpha = 1;
  }

  drawVignette() {
    const gradient = this.ctx.createRadialGradient(this.width/2,this.height/2,this.height*.18,this.width/2,this.height/2,this.width*.72);
    gradient.addColorStop(0,'transparent');gradient.addColorStop(1,'#04111788');this.ctx.fillStyle=gradient;this.ctx.fillRect(0,0,this.width,this.height);
  }
}

const game = new SnowyRun($('#game'));
$('#start-game').addEventListener('click', () => game.start());
$('#restart-game').addEventListener('click', () => game.start());
$('#replay-game').addEventListener('click', () => game.replay());
$('#export-line').addEventListener('click', () => game.exportLine());
$('#close-replay').addEventListener('click', () => game.closeReplay());
$('#replay-play').addEventListener('click', (event) => {
  game.replayPlaying = !game.replayPlaying;
  if (game.replayPlaying && game.replayCursor >= game.lastReplay.length - 1) game.replayCursor = 0;
  event.currentTarget.textContent = game.replayPlaying ? 'Ⅱ' : '▶';
});
$('#replay-scrubber').addEventListener('input', (event) => {
  game.replayCursor = Number(event.currentTarget.value) / 100 * Math.max(0, game.lastReplay.length - 1);
});
$('#replay-speed').addEventListener('change', (event) => { game.replaySpeed = Number(event.currentTarget.value); });
$$('[data-camera]').forEach((button) => button.addEventListener('click', () => {
  $$('[data-camera]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  game.replayCamera = button.dataset.camera;
}));
$('#pause-game').addEventListener('click', () => game.pause());
$('#resume-game').addEventListener('click', () => game.resume());
$('#reset-game').addEventListener('click', () => {
  $('#pause-overlay').classList.remove('visible');
  game.start();
});

$$('.ride-toggle button').forEach((button) => button.addEventListener('click', () => {
  $$('.ride-toggle button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  game.ride = button.dataset.ride;
  $('#game').setAttribute('aria-label', `Protótipo jogável de ${game.ride === 'ski' ? 'ski' : 'snowboard'}`);
  if (!game.running) game.render();
}));

$$('.route-toggle button').forEach((button) => button.addEventListener('click', () => {
  if (game.running) return;
  $$('.route-toggle button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  game.route = button.dataset.route;
  game.reset();
  game.render();
  const objective = routes[game.route].objective;
  $('.mission b').textContent = `${objective.flow} FLOW · ${objective.clean}% precisão · ${objective.speed} km/h.`;
}));

$$('.weather-toggle button').forEach((button) => button.addEventListener('click', () => {
  $$('.weather-toggle button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  game.weather = button.dataset.weather;
  $('#weather-fx').classList.toggle('storm', game.weather === 'storm');
  if (!game.running) game.render();
}));

$('#sound-toggle').addEventListener('click', (event) => {
  if (game.audio.enabled) game.audio.disable();
  else game.audio.enable();
  const enabled = game.audio.enabled;
  event.currentTarget.textContent = enabled ? 'ÁUDIO: ON' : 'ÁUDIO: INDISPONÍVEL';
  if (!enabled && game.audio.context) event.currentTarget.textContent = 'ÁUDIO: OFF';
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
});
