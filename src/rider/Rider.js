import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const COLORS = {
  jacket: new THREE.Color(0x1458c7),
  pants: new THREE.Color(0xe66f20),
  dark: new THREE.Color(0x11181d),
  skin: new THREE.Color(0xb7a898)
};

function classifyBone(name='') {
  const n = name.toLowerCase();
  if (/(thigh|calf)/.test(n)) return COLORS.pants;
  if (/(foot|ball|hand|head|neck)/.test(n)) return COLORS.dark;
  if (/(pelvis|spine|clavicle|upperarm|lowerarm)/.test(n)) return COLORS.jacket;
  return COLORS.jacket;
}

function colorSkinnedMesh(mesh) {
  const geometry = mesh.geometry;
  const skinIndex = geometry.getAttribute('skinIndex');
  const skinWeight = geometry.getAttribute('skinWeight');
  if (!skinIndex || !skinWeight || !mesh.skeleton) return;

  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i=0;i<geometry.attributes.position.count;i++) {
    let bestWeight = -1;
    let bestIndex = 0;
    const weights = [skinWeight.getX(i), skinWeight.getY(i), skinWeight.getZ(i), skinWeight.getW(i)];
    const indices = [skinIndex.getX(i), skinIndex.getY(i), skinIndex.getZ(i), skinIndex.getW(i)];
    for (let k=0;k<4;k++) {
      const weight = weights[k];
      if (weight > bestWeight) {
        bestWeight = weight;
        bestIndex = indices[k];
      }
    }
    const bone = mesh.skeleton.bones[bestIndex];
    const c = classifyBone(bone?.name);
    colors[i*3] = c.r;
    colors[i*3+1] = c.g;
    colors[i*3+2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors,3));
  mesh.material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: .74,
    metalness: 0,
    skinning: true
  });
}

export class Rider {
  constructor() {
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';

    this.stance = new THREE.Group();
    this.group.add(this.stance);

    this.fallback = this.createFallback();
    this.fallback.scale.setScalar(.52);
    this.stance.add(this.fallback);

    this.board = new THREE.Mesh(
      new THREE.BoxGeometry(1.15,.19,6.1),
      new THREE.MeshStandardMaterial({ color:0xb96320, roughness:.56, metalness:.03 })
    );
    this.board.position.y = .18;
    this.board.castShadow = this.board.receiveShadow = true;
    this.stance.add(this.board);

    this.backpack = new THREE.Mesh(
      new THREE.BoxGeometry(2.2,2.7,.95),
      new THREE.MeshStandardMaterial({color:0x171d20,roughness:.72})
    );
    this.backpack.position.set(0,5.15,1.0);
    this.backpack.rotation.x = -.13;
    this.backpack.castShadow = true;
    this.stance.add(this.backpack);

    this.bones = new Map();
    this.bind = new Map();
    this.loaded = false;
    this.loadRiggedModel();
  }

  createFallback() {
    const root = new THREE.Group();
    const blue = new THREE.MeshStandardMaterial({ color: 0x1458c7, roughness: .72 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xe66f20, roughness: .82 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x11181d, roughness: .66 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(2.35, 5.6, 7, 10), blue);
    torso.position.y = 8.8;
    torso.scale.z = .72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.75,18,12),dark);
    head.position.set(0,14.4,-.25);
    const hip = new THREE.Group();
    hip.position.y = 5.45;

    for (const side of [-1,1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.8,4.4,5,8),orange);
      leg.position.set(side*1.25,-1.65,0);
      leg.rotation.set(.46,0,side*.17);
      hip.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.55,4.6,5,8),blue);
      arm.position.set(side*3.1,9.6,0);
      arm.rotation.z = side*.62;
      root.add(arm);
    }

    [torso,head].forEach(m=>{m.castShadow=true;m.receiveShadow=true;});
    hip.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    root.add(torso,head,hip);
    return root;
  }

  loadRiggedModel() {
    const url = `${import.meta.env.BASE_URL}assets/rider.glb`;
    new GLTFLoader().load(url, gltf => {
      const model = gltf.scene;
      model.traverse(object => {
        if (object.isSkinnedMesh) {
          colorSkinnedMesh(object);
          object.castShadow = true;
          object.receiveShadow = true;
          object.frustumCulled = false;
        } else if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
        if (object.isBone) {
          this.bones.set(object.name,object);
          this.bind.set(object.name,object.quaternion.clone());
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const targetHeight = 7.7;
      const scale = targetHeight / Math.max(.001,size.y);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);

      const normalizedBox = new THREE.Box3().setFromObject(model);
      const center = normalizedBox.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y += .38 - normalizedBox.min.y;
      model.rotation.y = Math.PI;

      this.model = model;
      this.stance.add(model);
      this.fallback.visible = false;
      this.loaded = true;
      this.poseBones(0,0);
    }, undefined, () => {
      this.fallback.visible = true;
    });
  }

  bone(name) { return this.bones.get(name); }

  setBone(name, x=0,y=0,z=0) {
    const bone = this.bone(name);
    const bind = this.bind.get(name);
    if (!bone || !bind) return;
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'));
    bone.quaternion.copy(bind).multiply(delta);
  }

  poseBones(steer, speed01) {
    if (!this.loaded) return;
    const edge = THREE.MathUtils.clamp(steer,-1,1);

    this.setBone('pelvis', -.18, edge*.10, edge*.08);
    this.setBone('spine_01', .15, edge*.06, -edge*.04);
    this.setBone('spine_02', .08, edge*.04, -edge*.07);
    this.setBone('spine_03', -.04, -edge*.08, -edge*.08);
    this.setBone('neck_01', .08, -edge*.06, 0);

    this.setBone('thigh_l', -.74 - speed01*.10, .05, .08);
    this.setBone('thigh_r', -.72 - speed01*.10, -.05, -.08);
    this.setBone('calf_l', 1.26 + speed01*.18, 0, 0);
    this.setBone('calf_r', 1.30 + speed01*.18, 0, 0);
    this.setBone('foot_l', -.42, 0, .06);
    this.setBone('foot_r', -.42, 0, -.06);

    this.setBone('upperarm_l', -.12, -.10, -.82 - edge*.22);
    this.setBone('upperarm_r', -.12, .10, .82 - edge*.22);
    this.setBone('lowerarm_l', -.28, 0, -.18);
    this.setBone('lowerarm_r', -.28, 0, .18);
  }

  setPose({ steer, speed, airborne }) {
    const lean = THREE.MathUtils.clamp(steer*.30,-.38,.38);
    const speed01 = THREE.MathUtils.clamp(speed/115,0,1);

    this.stance.rotation.z = THREE.MathUtils.lerp(this.stance.rotation.z,-lean,.12);
    this.stance.rotation.x = THREE.MathUtils.lerp(
      this.stance.rotation.x,
      airborne ? -.10 : .04 + speed01*.10,
      .09
    );
    this.board.rotation.z = THREE.MathUtils.lerp(this.board.rotation.z,steer*.07,.11);
    this.backpack.rotation.z = THREE.MathUtils.lerp(this.backpack.rotation.z,-lean*.45,.1);
    this.poseBones(steer,speed01);
  }
}
