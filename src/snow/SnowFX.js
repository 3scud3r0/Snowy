import * as THREE from 'three';

function particleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(48,48,1,48,48,46);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(.28,'rgba(255,255,255,.92)');
  g.addColorStop(.68,'rgba(255,255,255,.28)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,96,96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class SnowFX {
  constructor(scene) {
    const puff = particleTexture();

    this.sprayCount = 620;
    this.positions = new Float32Array(this.sprayCount * 3);
    this.life = new Float32Array(this.sprayCount);
    this.velocity = Array.from({ length: this.sprayCount }, () => new THREE.Vector3());
    for (let i=0;i<this.sprayCount;i++) this.positions[i*3+1] = -999;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff,
      map: puff,
      alphaMap: puff,
      alphaTest: .015,
      size: 1.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: .72,
      depthWrite: false,
      blending: THREE.NormalBlending
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;

    const count = 1450;
    const flakes = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      flakes[i*3] = (Math.random()-.5)*850;
      flakes[i*3+1] = Math.random()*220+30;
      flakes[i*3+2] = -Math.random()*2500+180;
    }
    const fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.BufferAttribute(flakes, 3));
    this.flakes = new THREE.Points(fgeo, new THREE.PointsMaterial({
      color:0xffffff,
      map:puff,
      alphaMap:puff,
      alphaTest:.02,
      size:.5,
      sizeAttenuation:true,
      transparent:true,
      opacity:.45,
      depthWrite:false
    }));
    this.flakes.frustumCulled = false;
    scene.add(this.flakes);
  }

  emit(position, speed, steer) {
    if (speed < 8) return;
    const amount = Math.min(20, 2 + Math.floor(speed / 8));
    const edge = Math.abs(steer);
    for (let n=0;n<amount;n++) {
      const i=this.cursor++%this.sprayCount, k=i*3;
      this.positions[k]=position.x+(Math.random()-.5)*(1.2+edge*2.4);
      this.positions[k+1]=position.y+.18+Math.random()*.65;
      this.positions[k+2]=position.z+1.4+Math.random()*1.8;
      this.velocity[i].set(
        (Math.random()-.5)*(4+edge*10)-steer*5.5,
        1.6+Math.random()*(3.5+edge*2),
        3+Math.random()*(7+speed*.045)
      );
      this.life[i]=.45+Math.random()*.55;
    }
  }

  update(dt, playerZ) {
    for(let i=0;i<this.sprayCount;i++){
      if(this.life[i]<=0) continue;
      const k=i*3,v=this.velocity[i];
      this.life[i]-=dt;
      v.y-=10.5*dt;
      v.x*=Math.exp(-dt*1.8);
      v.z*=Math.exp(-dt*.8);
      this.positions[k]+=v.x*dt;
      this.positions[k+1]+=v.y*dt;
      this.positions[k+2]+=v.z*dt;
      if(this.life[i]<=0) this.positions[k+1]=-999;
    }
    this.points.geometry.attributes.position.needsUpdate=true;
    this.flakes.position.z = playerZ * .025;
    this.flakes.rotation.y += dt*.004;
  }
}
