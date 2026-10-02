import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

function radialTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0,'rgba(255,250,224,1)');
  g.addColorStop(.16,'rgba(255,238,185,.95)');
  g.addColorStop(.42,'rgba(255,220,145,.34)');
  g.addColorStop(1,'rgba(255,220,145,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(canvas);
}

export function createAtmosphere(scene) {
  const sky = new Sky();
  sky.scale.setScalar(8000);
  const u = sky.material.uniforms;
  u.turbidity.value = 6.2;
  u.rayleigh.value = 1.65;
  u.mieCoefficient.value = .006;
  u.mieDirectionalG.value = .84;

  const phi = THREE.MathUtils.degToRad(68);
  const theta = THREE.MathUtils.degToRad(136);
  const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  u.sunPosition.value.copy(sun);
  scene.add(sky);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture(),
    color: 0xfff5cf,
    transparent: true,
    opacity: .92,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  sprite.scale.set(230,230,1);
  sprite.position.copy(sun.clone().multiplyScalar(2600));
  sprite.position.y += 600;
  scene.add(sprite);

  return { sunDirection: sun, sunSprite: sprite };
}

export function createAlpineBackdrop(scene) {
  const group = new THREE.Group();
  const snow = new THREE.MeshStandardMaterial({ color: 0xd9e5ea, roughness: .96 });
  const shade = new THREE.MeshStandardMaterial({ color: 0x738b99, roughness: 1 });
  const random = (() => { let s=7319; return () => ((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296); })();

  for (let i=0;i<34;i++) {
    const x = -1900 + i * 115 + (random()-.5)*90;
    const z = -3300 - random()*550;
    const h = 280 + random()*620;
    const r = h * (.36 + random()*.18);
    const mat = i % 3 === 0 ? shade : snow;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r,h,5,1),mat);
    peak.position.set(x, h*.5 - 110, z);
    peak.rotation.y=random()*Math.PI;
    peak.scale.z=.7+random()*.7;
    group.add(peak);
  }
  group.frustumCulled=false;
  scene.add(group);
  return group;
}
