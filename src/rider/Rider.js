import * as THREE from 'three';

export class Rider {
  constructor() {
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';
    this.group.scale.setScalar(.52);
    this.pose = new THREE.Group();
    this.group.add(this.pose);

    const blue = new THREE.MeshStandardMaterial({ color: 0x1458c7, roughness: .72 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xe66f20, roughness: .82 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x11181d, roughness: .66 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xb96320, roughness: .58 });

    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(2.35, 5.6, 7, 10), blue);
    this.torso.position.y = 8.8;
    this.torso.scale.z = .72;

    const head = new THREE.Mesh(new THREE.SphereGeometry(1.75, 18, 12), dark);
    head.position.set(0, 14.4, -.25);

    const pack = new THREE.Mesh(new THREE.BoxGeometry(4.1, 5.1, 2.4), dark);
    pack.position.set(0, 9.6, 2.3);
    pack.rotation.x = -.12;

    this.hip = new THREE.Group();
    this.hip.position.y = 5.45;
    this.arms = [];

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.8, 4.4, 5, 8), orange);
      leg.position.set(side * 1.25, -1.65, 0);
      leg.rotation.z = side * .17;
      leg.rotation.x = .46;
      this.hip.add(leg);

      const armPivot = new THREE.Group();
      armPivot.position.set(side * 2.2, 11.2, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.55, 4.6, 5, 8), blue);
      arm.position.y = -2.2;
      armPivot.add(arm);
      armPivot.rotation.z = side * .72;
      armPivot.rotation.x = -.12;
      this.arms.push(armPivot);
      this.pose.add(armPivot);
    }

    this.board = new THREE.Mesh(new THREE.BoxGeometry(2.2, .36, 11.7), boardMat);
    this.board.position.y = .42;
    this.board.rotation.y = -.02;

    [this.torso, head, pack, this.board].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
    this.hip.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.arms.forEach(a => a.traverse(o => { if (o.isMesh) o.castShadow = true; }));
    this.pose.add(this.torso, head, pack, this.hip, this.board);
  }

  setPose({ steer, speed, airborne }) {
    const lean = THREE.MathUtils.clamp(steer * .38, -.52, .52);
    const speed01 = THREE.MathUtils.clamp(speed / 115, 0, 1);

    this.pose.rotation.z = THREE.MathUtils.lerp(this.pose.rotation.z, -lean, .14);
    this.pose.rotation.x = THREE.MathUtils.lerp(
      this.pose.rotation.x,
      airborne ? -.16 : .07 + speed01 * .18,
      .1
    );

    this.hip.rotation.x = THREE.MathUtils.lerp(this.hip.rotation.x, .08 + speed01 * .22, .12);
    this.torso.scale.y = THREE.MathUtils.lerp(this.torso.scale.y, 1 - speed01 * .08, .08);
    this.board.rotation.z = THREE.MathUtils.lerp(this.board.rotation.z, steer * .09, .12);

    this.arms[0].rotation.z = THREE.MathUtils.lerp(this.arms[0].rotation.z, -.68 - steer * .32, .12);
    this.arms[1].rotation.z = THREE.MathUtils.lerp(this.arms[1].rotation.z, .68 - steer * .32, .12);
    this.arms[0].rotation.x = THREE.MathUtils.lerp(this.arms[0].rotation.x, airborne ? -.65 : -.12, .1);
    this.arms[1].rotation.x = THREE.MathUtils.lerp(this.arms[1].rotation.x, airborne ? .35 : -.12, .1);
  }
}
