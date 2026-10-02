import * as THREE from 'three';
import { terrainHeight } from './terrain.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = Math.imul(1664525, s) + 1013904223 >>> 0) / 4294967296);
}


function createSpruceGeometry() {
  const segments = 10;
  const height = 18;
  const rings = [
    [0.00,.42],
    [0.08,4.75],
    [0.19,3.20],
    [0.27,4.22],
    [0.38,2.86],
    [0.47,3.70],
    [0.58,2.38],
    [0.67,3.02],
    [0.77,1.80],
    [0.86,2.20],
    [0.94,1.05],
    [1.00,.05]
  ];

  const positions = [];
  const colors = [];
  const indices = [];
  const green = new THREE.Color(0x12372f);
  const deep = new THREE.Color(0x09251f);
  const snow = new THREE.Color(0xe7eeee);

  for (let r=0;r<rings.length;r++) {
    const [yn,baseRadius] = rings[r];
    for (let s=0;s<segments;s++) {
      const angle = s/segments*Math.PI*2;
      const irregular = 1 + Math.sin(angle*3.0+r*.91)*.055 + Math.sin(angle*5.0-r*.47)*.025;
      const radius = baseRadius*irregular;
      positions.push(
        Math.cos(angle)*radius,
        yn*height,
        Math.sin(angle)*radius
      );

      const base = deep.clone().lerp(green,.35+yn*.45);
      const snowyTier = r%2===0 ? .10 : 0;
      const snowAmount = THREE.MathUtils.clamp((yn-.18)*.50+snowyTier,0,.48);
      base.lerp(snow,snowAmount);
      colors.push(base.r,base.g,base.b);
    }
  }

  for (let r=0;r<rings.length-1;r++) {
    for (let s=0;s<segments;s++) {
      const next = (s+1)%segments;
      const a=r*segments+s;
      const b=r*segments+next;
      const c=(r+1)*segments+s;
      const d=(r+1)*segments+next;
      indices.push(a,c,b,b,c,d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createPines(count = 820) {
  const random = rng(4312);
  const trunkGeo = new THREE.CylinderGeometry(.34,.55,8,7);
  const crownGeo = createSpruceGeometry();

  const trunkMat = new THREE.MeshStandardMaterial({color:0x40342a,roughness:1});
  const crownMat = new THREE.MeshStandardMaterial({
    color:0xffffff,
    vertexColors:true,
    roughness:.92,
    metalness:0
  });

  const trunks = new THREE.InstancedMesh(trunkGeo,trunkMat,count);
  const crowns = new THREE.InstancedMesh(crownGeo,crownMat,count);
  trunks.castShadow = crowns.castShadow = true;
  trunks.receiveShadow = crowns.receiveShadow = true;
  trunks.frustumCulled = crowns.frustumCulled = false;

  const dummy = new THREE.Object3D();

  for (let i=0;i<count;i++) {
    const z = -random()*2470+270;
    let x;

    if (i < count*.64) {
      const side = random() < .5 ? -1 : 1;
      x = side*(42+Math.pow(random(),1.55)*155);
    } else {
      do {
        x=(random()-.5)*860;
      } while (Math.abs(x)<105);
    }

    const h = terrainHeight(x,z);
    const nearTrail = Math.abs(x)<205;
    const scale = .60+random()*.78+(nearTrail ? .10 : 0);
    const yaw = random()*Math.PI*2;
    const leanX = (random()-.5)*.035;
    const leanZ = (random()-.5)*.035;

    dummy.position.set(x,h+4*scale,z);
    dummy.scale.set(scale,scale,scale);
    dummy.rotation.set(leanX,yaw,leanZ);
    dummy.updateMatrix();
    trunks.setMatrixAt(i,dummy.matrix);

    dummy.position.set(x,h+1.25*scale,z);
    dummy.scale.set(scale,scale,scale);
    dummy.rotation.set(leanX,yaw,leanZ);
    dummy.updateMatrix();
    crowns.setMatrixAt(i,dummy.matrix);
  }

  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.add(trunks,crowns);
  return group;
}

export function createBirches(count = 150) {
  const random = rng(8137);
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(.18, .32, 13, 6),
    new THREE.MeshStandardMaterial({ color: 0xe3e2d9, roughness: .95 }),
    count
  );
  const crown = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(3.6, 1),
    new THREE.MeshStandardMaterial({ color: 0xc9cfcd, transparent: true, opacity: .16, roughness: 1, depthWrite:false }),
    count
  );
  trunk.castShadow = crown.castShadow = true;
  trunk.frustumCulled = crown.frustumCulled = false;
  const dummy = new THREE.Object3D();

  for (let i=0;i<count;i++) {
    const side = random() < .5 ? -1 : 1;
    const x = side*(38+Math.pow(random(),1.45)*150);
    const z = -random() * 2200 + 170;
    const h = terrainHeight(x,z);
    const s = .65 + random()*.75;
    dummy.position.set(x,h+6.5*s,z);
    dummy.scale.set(s,s,s);
    dummy.rotation.set((random()-.5)*.06,random()*Math.PI,(random()-.5)*.08);
    dummy.updateMatrix(); trunk.setMatrixAt(i,dummy.matrix);
    dummy.position.y = h + 13.1*s;
    dummy.scale.set(s*.72,s*.55,s*.72);
    dummy.updateMatrix(); crown.setMatrixAt(i,dummy.matrix);
  }
  trunk.instanceMatrix.needsUpdate = crown.instanceMatrix.needsUpdate = true;
  const group = new THREE.Group(); group.add(trunk,crown); return group;
}

export function createRocks(count = 190) {
  const random = rng(9981);
  const geo = new THREE.DodecahedronGeometry(3.8, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x414a4d, roughness: .97 });
  const rocks = new THREE.InstancedMesh(geo, mat, count);
  rocks.castShadow = rocks.receiveShadow = true;
  rocks.frustumCulled = false;
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const x = (random() - .5) * 800;
    const z = -random() * 2380 + 180;
    if (Math.abs(x) < 105) { i--; continue; }
    const s = .45 + random() * 1.9;
    dummy.position.set(x, terrainHeight(x, z) + 1.05 * s, z);
    dummy.scale.set(s * (1 + random()), s * (.6 + random()), s);
    dummy.rotation.set(random(), random() * 4, random());
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  return rocks;
}

export function createCabin(x = 142, z = -930) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x563621, roughness: .9 });
  const snow = new THREE.MeshStandardMaterial({ color: 0xf2f5f3, roughness: .84 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xffd493, emissive: 0xff8f28, emissiveIntensity: 1.7 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(30, 13, 20), wood);
  base.position.y = 6.5;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(21, 10, 4), snow);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 17;

  for (const side of [-1,1]) {
    const window = new THREE.Mesh(new THREE.PlaneGeometry(3.5,4),glow);
    window.position.set(side*7,7,-10.05);
    g.add(window);
  }

  base.castShadow = roof.castShadow = true;
  base.receiveShadow = roof.receiveShadow = true;
  g.add(base, roof);
  g.position.set(x, terrainHeight(x, z), z);
  g.rotation.y = -.25;
  return g;
}

export function createLift() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x39454a, roughness: .72, metalness: .4 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1d2529, roughness: .75 });
  const cableMat = new THREE.LineBasicMaterial({ color: 0x263238 });
  const points = [];

  for (let i = 0; i < 8; i++) {
    const z = -210 - i * 238;
    const x = -280 + i * 9;
    const y = terrainHeight(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.55, .8, 27, 6), metal);
    pole.position.set(x, y + 13.5, z);
    pole.castShadow = true;
    g.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(18, .7, .8), metal);
    arm.position.set(x, y + 27, z);
    arm.castShadow = true;
    g.add(arm);
    points.push(new THREE.Vector3(x - 8, y + 29, z));

    if (i < 7) {
      const chair = new THREE.Group();
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,7,5),metal);
      hanger.position.y = -3.5;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(5.8,.5,2.5),seatMat);
      seat.position.set(0,-7,0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(5.8,3,.4),seatMat);
      back.position.set(0,-5.8,1.05);
      chair.add(hanger,seat,back);
      chair.position.set(x-8,y+29,z-105);
      g.add(chair);
    }
  }

  const curve = new THREE.CatmullRomCurve3(points);
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)), cableMat));
  return g;
}

export function createFrozenLake() {
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(330, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x7fa9bd,
      roughness: .34,
      metalness: .05,
      transmission: .04,
      clearcoat: .45,
      clearcoatRoughness: .28
    })
  );
  lake.rotation.x = -Math.PI / 2;
  lake.scale.set(1.7,.82,1);
  lake.position.set(210,-126,-2840);
  lake.receiveShadow = true;
  return lake;
}

export function createCheckpoint(z = -1920) {
  const g = new THREE.Group();
  const x = -22, y = terrainHeight(x, z) + 4;
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7a12, emissive: 0xff4b00, emissiveIntensity: .65, roughness: .55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf9fcfb, roughness: .7 });

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(2, 15, 2), orange);
    post.position.set(side * 15, 7.5, 0);
    post.castShadow = true;
    g.add(post);
  }

  const bar = new THREE.Mesh(new THREE.BoxGeometry(32, 3.5, 2), white);
  bar.position.y = 14;
  bar.castShadow = true;
  g.add(bar);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(.52, .2, 300, 10),
    new THREE.MeshBasicMaterial({ color: 0xff8a24, transparent: true, opacity: .68, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  beam.position.y = 165;
  g.add(beam);

  const glow = new THREE.PointLight(0xff8a24, 38, 150, 2);
  glow.position.y = 18;
  g.add(glow);

  g.position.set(x, y, z);
  g.userData = { x, z };
  return g;
}
