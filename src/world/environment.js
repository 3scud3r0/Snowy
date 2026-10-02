import * as THREE from 'three';
import { terrainHeight } from './terrain.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = Math.imul(1664525, s) + 1013904223 >>> 0) / 4294967296);
}

export function createPines(count = 950) {
  const random = rng(4312);
  const trunkGeo = new THREE.CylinderGeometry(.38, .58, 8, 5);
  const crownGeo = new THREE.ConeGeometry(4.6, 15, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x44372d, roughness: 1 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x173a31, roughness: .92 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);
  trunks.castShadow = crowns.castShadow = true;
  trunks.receiveShadow = crowns.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    let x, z;
    do {
      x = (random() - .5) * 840;
      z = -random() * 2450 + 260;
    } while (Math.abs(x) < 70 + random() * 115);
    const h = terrainHeight(x, z);
    const scale = .58 + random() * .78;
    dummy.position.set(x, h + 4 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.y = random() * Math.PI * 2;
    dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = h + 11 * scale;
    dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix);
  }
  const group = new THREE.Group(); group.add(trunks, crowns); return group;
}

export function createRocks(count = 180) {
  const random = rng(9981);
  const geo = new THREE.DodecahedronGeometry(3.8, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3f4749, roughness: .96 });
  const rocks = new THREE.InstancedMesh(geo, mat, count);
  rocks.castShadow = rocks.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const x = (random() - .5) * 780;
    const z = -random() * 2350 + 160;
    if (Math.abs(x) < 110) { i--; continue; }
    const s = .45 + random() * 1.85;
    dummy.position.set(x, terrainHeight(x, z) + 1.2 * s, z);
    dummy.scale.set(s * (1 + random()), s * (.6 + random()), s);
    dummy.rotation.set(random(), random() * 4, random());
    dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
  }
  return rocks;
}

export function createCabin(x = 142, z = -930) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x573723, roughness: .9 });
  const snow = new THREE.MeshStandardMaterial({ color: 0xf4f7f5, roughness: .82 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(30, 13, 20), wood); base.position.y = 6.5;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(21, 10, 4), snow); roof.rotation.y = Math.PI / 4; roof.position.y = 17;
  base.castShadow = roof.castShadow = true; base.receiveShadow = roof.receiveShadow = true;
  g.add(base, roof); g.position.set(x, terrainHeight(x, z), z); g.rotation.y = -.25; return g;
}

export function createLift() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x39454a, roughness: .72, metalness: .35 });
  const cableMat = new THREE.LineBasicMaterial({ color: 0x263238 });
  const points = [];
  for (let i = 0; i < 7; i++) {
    const z = -260 - i * 250, x = -275 + i * 10, y = terrainHeight(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.55, .8, 27, 6), metal);
    pole.position.set(x, y + 13.5, z); pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(18, .7, .8), metal);
    arm.position.set(x, y + 27, z); arm.castShadow = true; g.add(arm);
    points.push(new THREE.Vector3(x - 8, y + 29, z));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(100)), cableMat));
  return g;
}

export function createCheckpoint(z = -1920) {
  const g = new THREE.Group();
  const x = -22, y = terrainHeight(x, z) + 4;
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7a12, emissive: 0x4a1700, roughness: .6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf9fcfb, roughness: .7 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(2, 15, 2), orange);
    post.position.set(side * 15, 7.5, 0); post.castShadow = true; g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(32, 3.5, 2), white);
  bar.position.y = 14; bar.castShadow = true; g.add(bar);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 260, 8), new THREE.MeshBasicMaterial({ color: 0xff8a24, transparent: true, opacity: .55 }));
  beam.position.y = 145; g.add(beam);
  const glow = new THREE.PointLight(0xff8a24, 25, 120, 2); glow.position.y = 18; g.add(glow);
  g.position.set(x, y, z); g.userData = { x, z }; return g;
}
