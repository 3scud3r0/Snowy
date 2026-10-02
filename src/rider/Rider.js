import * as THREE from 'three';

export class Rider {
  constructor() {
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';
    const blue = new THREE.MeshStandardMaterial({ color: 0x1458c7, roughness: .74 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xe46e21, roughness: .82 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x11181d, roughness: .7 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xb85d1c, roughness: .6 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(2.4, 5.8, 7, 10), blue);
    torso.position.y = 8.8; torso.scale.z = .72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.8, 18, 12), dark);
    head.position.set(0, 14.5, -.3);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 2.3), dark);
    pack.position.set(0, 9.5, 2.25);
    const hip = new THREE.Group(); hip.position.y = 5.5;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.8, 4.5, 5, 8), orange);
      leg.position.set(side * 1.25, -1.7, 0); leg.rotation.z = side * .16; leg.rotation.x = .42; hip.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.55, 4.7, 5, 8), blue);
      arm.position.set(side * 3.1, 10, 0); arm.rotation.z = side * .62; this.group.add(arm);
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(11.5, .38, 2.2), boardMat);
    board.position.y = .45; board.rotation.y = -.08;
    [torso, head, pack, board].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
    hip.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.group.add(torso, head, pack, hip, board);
  }

  setPose({ steer, speed, airborne }) {
    const lean = THREE.MathUtils.clamp(steer * .34, -.5, .5);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -lean, .14);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, airborne ? -.08 : .10 + Math.min(speed / 220, .18), .08);
  }
}
