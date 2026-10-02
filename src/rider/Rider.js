import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const COLORS = {
  jacket: new THREE.Color(0x1458c7),
  pants: new THREE.Color(0xe66f20),
  dark: new THREE.Color(0x11181d)
};

function classifyBone(name='') {
  const n = name.toLowerCase();
  if (/(thigh|calf)/.test(n)) return COLORS.pants;
  if (/(foot|ball|hand|head|neck)/.test(n)) return COLORS.dark;
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
      if (weights[k] > bestWeight) {
        bestWeight = weights[k];
        bestIndex = indices[k];
      }
    }
    const c = classifyBone(mesh.skeleton.bones[bestIndex]?.name);
    colors[i*3] = c.r;
    colors[i*3+1] = c.g;
    colors[i*3+2] = c.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors,3));
  mesh.material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: .72,
    metalness: 0
  });
}

function snowboardGeometry() {
  const halfW = .63;
  const halfL = 2.86;
  const tip = .42;
  const shape = new THREE.Shape();

  shape.moveTo(-halfW, -halfL + tip);
  shape.quadraticCurveTo(-halfW, -halfL + .08, -.24, -halfL);
  shape.quadraticCurveTo(0, -halfL - .07, .24, -halfL);
  shape.quadraticCurveTo(halfW, -halfL + .08, halfW, -halfL + tip);
  shape.lineTo(halfW, halfL - tip);
  shape.quadraticCurveTo(halfW, halfL - .08, .24, halfL);
  shape.quadraticCurveTo(0, halfL + .07, -.24, halfL);
  shape.quadraticCurveTo(-halfW, halfL - .08, -halfW, halfL - tip);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .16,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: .045,
    bevelThickness: .045,
    curveSegments: 5
  });
  geometry.center();
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function binding(material, z) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(.92,.16,.62), material);
  base.position.y = .17;
  const heel = new THREE.Mesh(new THREE.BoxGeometry(.72,.72,.12), material);
  heel.position.set(0,.48,z > 0 ? .22 : -.22);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(.34,.065,6,12,Math.PI), material);
  strap.rotation.set(Math.PI / 2,0,z > 0 ? 0 : Math.PI);
  strap.position.y = .42;
  group.add(base,heel,strap);
  group.position.z = z;
  group.rotation.y = z > 0 ? .10 : -.10;
  return group;
}

export class Rider {
  constructor() {
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';

    this.stance = new THREE.Group();
    this.group.add(this.stance);

    this.bodyYaw = -.08;
    this.boardYaw = .52;

    this.fallback = this.createFallback();
    this.fallback.scale.setScalar(.48);
    this.fallback.rotation.y = this.bodyYaw;
    this.stance.add(this.fallback);

    const boardMaterial = new THREE.MeshStandardMaterial({
      color: 0xb86622,
      roughness: .48,
      metalness: .04
    });
    const bindingMaterial = new THREE.MeshStandardMaterial({
      color: 0x151c20,
      roughness: .66,
      metalness: .08
    });

    this.boardAssembly = new THREE.Group();
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color:0x101619,
      roughness:.42,
      metalness:.32
    });
    this.boardEdge = new THREE.Mesh(snowboardGeometry(),edgeMaterial);
    this.boardEdge.position.y = .10;
    this.boardEdge.scale.set(1.025,.92,1.025);
    this.boardEdge.castShadow = true;

    this.board = new THREE.Mesh(snowboardGeometry(),boardMaterial);
    this.board.position.y = .205;
    this.board.castShadow = this.board.receiveShadow = true;

    this.boardAssembly.add(
      this.boardEdge,
      this.board,
      binding(bindingMaterial,-1.12),
      binding(bindingMaterial,1.12)
    );
    this.boardAssembly.rotation.y = this.boardYaw;
    this.stance.add(this.boardAssembly);

    this.backpack = new THREE.Mesh(
      new THREE.CapsuleGeometry(.58,.72,5,8),
      new THREE.MeshStandardMaterial({color:0x202a2f,roughness:.78})
    );
    this.backpack.scale.set(1,.92,.58);
    const packOffset = new THREE.Vector3(0,4.72,.72).applyAxisAngle(new THREE.Vector3(0,1,0),this.bodyYaw);
    this.backpack.position.copy(packOffset);
    this.backpack.rotation.set(-.12,this.bodyYaw,0);
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

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(2.15,5.2,7,10),blue);
    torso.position.y = 8.1;
    torso.scale.z = .72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.6,18,12),dark);
    head.position.set(0,13.4,-.25);
    const hip = new THREE.Group();
    hip.position.y = 5.0;

    for (const side of [-1,1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.76,4.0,5,8),orange);
      leg.position.set(side*1.1,-1.55,0);
      leg.rotation.set(.55,0,side*.22);
      hip.add(leg);

      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.52,4.2,5,8),blue);
      arm.position.set(side*2.85,8.9,0);
      arm.rotation.z = side*.72;
      root.add(arm);
    }

    [torso,head].forEach(m=>{m.castShadow=true;m.receiveShadow=true;});
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
      model.scale.setScalar(7.7 / Math.max(.001,size.y));
      model.updateMatrixWorld(true);

      const normalizedBox = new THREE.Box3().setFromObject(model);
      const center = normalizedBox.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y += .34 - normalizedBox.min.y;
      model.rotation.y = Math.PI + this.bodyYaw;

      this.model = model;
      this.modelBaseY = model.position.y;
      this.stance.add(model);
      this.fallback.visible = false;
      this.loaded = true;
      this.poseBones(0,0);
    }, undefined, () => {
      this.fallback.visible = true;
    });
  }

  bone(name) { return this.bones.get(name); }

  setBone(name,x=0,y=0,z=0) {
    const bone = this.bone(name);
    const bind = this.bind.get(name);
    if (!bone || !bind) return;
    bone.quaternion.copy(bind).multiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'))
    );
  }

  solveLeg(suffix,targetLocal) {
    if (!this.loaded) return;

    const hip = this.bone(`thigh_${suffix}`);
    const knee = this.bone(`calf_${suffix}`);
    const ankle = this.bone(`foot_${suffix}`);
    if (!hip || !knee || !ankle) return;

    this.group.updateWorldMatrix(true,true);
    const target = this.stance.localToWorld(targetLocal.clone());

    for (let pass=0;pass<4;pass++) {
      for (const joint of [knee,hip]) {
        joint.updateWorldMatrix(true,true);

        const jointPos = joint.getWorldPosition(new THREE.Vector3());
        const endPos = ankle.getWorldPosition(new THREE.Vector3());
        const toEnd = endPos.sub(jointPos).normalize();
        const toTarget = target.clone().sub(jointPos).normalize();

        if (toEnd.lengthSq() < 1e-6 || toTarget.lengthSq() < 1e-6) continue;

        const delta = new THREE.Quaternion().setFromUnitVectors(toEnd,toTarget);
        const desiredWorld = delta.multiply(joint.getWorldQuaternion(new THREE.Quaternion()));
        const parentInverse = joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert();

        joint.quaternion.copy(parentInverse.multiply(desiredWorld));
        joint.updateWorldMatrix(false,true);
      }
    }
  }

  poseBones(steer,speed01) {
    if (!this.loaded) return;

    const edge = THREE.MathUtils.clamp(steer,-1,1);

    this.setBone('pelvis',-.24,edge*.10,edge*.05);
    this.setBone('spine_01',.30,-.13 + edge*.05,-edge*.05);
    this.setBone('spine_02',.18,-.11 + edge*.04,-edge*.08);
    this.setBone('spine_03',-.02,-.18-edge*.08,-edge*.10);
    this.setBone('neck_01',.08,.12-edge*.05,0);

    this.setBone('thigh_l',-.70,.05,-.30-edge*.06);
    this.setBone('thigh_r',-.66,-.05,.30-edge*.06);
    this.setBone('calf_l',1.18+speed01*.16,0,.08);
    this.setBone('calf_r',1.22+speed01*.16,0,-.08);
    this.setBone('foot_l',-.34,.03,-.16);
    this.setBone('foot_r',-.34,-.03,.16);

    this.setBone('upperarm_l',-.18,-.10,-.78-edge*.24);
    this.setBone('upperarm_r',-.18,.10,.78-edge*.24);
    this.setBone('lowerarm_l',-.35,0,-.12);
    this.setBone('lowerarm_r',-.35,0,.12);

    if (this.model) this.model.position.y = this.modelBaseY - .72 - speed01*.08;
  }

  setPose({ steer,speed,airborne }) {
    const lean = THREE.MathUtils.clamp(steer*.36,-.42,.42);
    const speed01 = THREE.MathUtils.clamp(speed/115,0,1);

    this.stance.rotation.z = THREE.MathUtils.lerp(this.stance.rotation.z,-lean,.13);
    this.stance.rotation.x = THREE.MathUtils.lerp(
      this.stance.rotation.x,
      airborne ? -.10 : .13 + speed01*.15,
      .10
    );
    this.stance.rotation.y = THREE.MathUtils.lerp(this.stance.rotation.y,steer*.035,.08);

    this.boardAssembly.rotation.z = THREE.MathUtils.lerp(this.boardAssembly.rotation.z,steer*.10,.12);
    this.boardAssembly.rotation.y = THREE.MathUtils.lerp(this.boardAssembly.rotation.y,this.boardYaw-steer*.12,.10);
    this.backpack.rotation.z = THREE.MathUtils.lerp(this.backpack.rotation.z,-lean*.35,.1);

    this.poseBones(steer,speed01);
  }
}
