import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

function radialTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0,'rgba(255,250,224,1)');
  g.addColorStop(.14,'rgba(255,238,185,.95)');
  g.addColorStop(.40,'rgba(255,220,145,.30)');
  g.addColorStop(1,'rgba(255,220,145,0)');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(canvas);
}

export function createAtmosphere(scene) {
  const sky = new Sky();
  sky.scale.setScalar(8000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2;
  u.rayleigh.value = 1.18;
  u.mieCoefficient.value = .0045;
  u.mieDirectionalG.value = .82;

  const phi = THREE.MathUtils.degToRad(70);
  const theta = THREE.MathUtils.degToRad(136);
  const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  u.sunPosition.value.copy(sun);
  scene.add(sky);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture(),
    color: 0xfff5cf,
    transparent: true,
    opacity: .88,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  sprite.scale.set(190,190,1);
  sprite.position.copy(sun.clone().multiplyScalar(2500));
  sprite.position.y += 430;
  scene.add(sprite);

  return { sunDirection: sun, sunSprite: sprite };
}

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = Math.imul(1664525, s) + 1013904223 >>> 0) / 4294967296);
}

export function createAlpineBackdrop(scene) {
  const width = 3900;
  const length = 1500;
  const geo = new THREE.PlaneGeometry(width, length, 190, 80);
  geo.rotateX(-Math.PI / 2);

  const random = rand(99271);
  const peaks = [];
  for (let i=0;i<18;i++) {
    peaks.push({
      x: -1900 + i * 225 + (random()-.5)*170,
      h: 260 + random()*620,
      w: 105 + random()*170
    });
  }

  const p = geo.attributes.position;
  const centerZ = -3370;

  for (let i=0;i<p.count;i++) {
    const x = p.getX(i);
    const localZ = p.getZ(i);
    const z = localZ + centerZ;
    let envelope = 0;
    for (const peak of peaks) {
      const dx = (x - peak.x) / peak.w;
      envelope = Math.max(envelope, peak.h * Math.exp(-dx*dx*.5));
    }
    const ridge = Math.exp(-Math.pow((z + 3540) / 520, 2));
    const detail =
      Math.sin(x*.011 + z*.004)*26 +
      Math.sin(x*.027 - z*.009)*15 +
      Math.sin(x*.063 + z*.015)*6;
    const terraces = Math.abs(Math.sin(x*.006 + z*.003))*24;
    p.setY(i, -165 + ridge * (envelope + detail + terraces));
  }

  p.needsUpdate = true;
  geo.computeVertexNormals();

  const n = geo.attributes.normal;
  const colors = new Float32Array(p.count*3);
  const snow = new THREE.Color(0xdce7ec);
  const shade = new THREE.Color(0x718796);
  const rock = new THREE.Color(0x52616b);

  for(let i=0;i<p.count;i++) {
    const slope = n.getY(i);
    const c = snow.clone().lerp(shade, THREE.MathUtils.clamp((1-slope)*.48,0,.48));
    if(slope < .55) c.lerp(rock, THREE.MathUtils.clamp((.55-slope)*1.6,0,.72));
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors:true,
    roughness:.98,
    metalness:0,
    fog:true
  });
  const range = new THREE.Mesh(geo,mat);
  range.position.z = 0;
  range.receiveShadow = true;
  scene.add(range);
  return range;
}
