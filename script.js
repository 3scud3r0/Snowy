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
