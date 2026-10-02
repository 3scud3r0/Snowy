import * as THREE from 'three';

export class SnowFX {
  constructor(scene) {
    this.sprayCount = 520;
    this.positions = new Float32Array(this.sprayCount * 3);
    this.life = new Float32Array(this.sprayCount);
    this.velocity = Array.from({ length: this.sprayCount }, () => new THREE.Vector3());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: .72, transparent: true, opacity: .72, depthWrite: false }));
    this.points.frustumCulled = false; scene.add(this.points); this.cursor = 0;

    const count = 1300, flakes = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      flakes[i*3] = (Math.random()-.5)*850;
      flakes[i*3+1] = Math.random()*220+30;
      flakes[i*3+2] = -Math.random()*2300+180;
    }
    const fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.BufferAttribute(flakes, 3));
    this.flakes = new THREE.Points(fgeo, new THREE.PointsMaterial({ color:0xffffff,size:.33,transparent:true,opacity:.48,depthWrite:false }));
    scene.add(this.flakes);
  }

  emit(position, speed, steer) {
    if (speed < 8) return;
    const amount = Math.min(18, 2 + Math.floor(speed / 9));
    for (let n=0;n<amount;n++) {
      const i=this.cursor++%this.sprayCount, k=i*3;
      this.positions[k]=position.x+(Math.random()-.5)*4;
      this.positions[k+1]=position.y+.3+Math.random()*1.3;
      this.positions[k+2]=position.z+2+Math.random()*2;
      this.velocity[i].set((Math.random()-.5)*8-steer*5,2+Math.random()*7,4+Math.random()*12);
      this.life[i]=.65+Math.random()*.55;
    }
  }

  update(dt, playerZ) {
    for(let i=0;i<this.sprayCount;i++){
      if(this.life[i]<=0) continue;
      const k=i*3,v=this.velocity[i];
      this.life[i]-=dt; v.y-=13*dt;
      this.positions[k]+=v.x*dt; this.positions[k+1]+=v.y*dt; this.positions[k+2]+=v.z*dt;
      if(this.life[i]<=0) this.positions[k+1]=-999;
    }
    this.points.geometry.attributes.position.needsUpdate=true;
    this.flakes.position.z = playerZ * .025;
    this.flakes.rotation.y += dt*.006;
  }
}
