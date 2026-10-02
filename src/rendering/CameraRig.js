import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.look = new THREE.Vector3();
    this.pos = new THREE.Vector3();
  }

  update(dt, rider, state, steer) {
    const speed = Math.abs(state.speed);
    const offset = new THREE.Vector3(-steer * 4.8, 8.2 + speed * .018, 17.5 + speed * .045);
    const targetPos = rider.position.clone().add(offset);
    this.pos.lerp(targetPos, 1 - Math.exp(-dt * 4.2));
    this.camera.position.copy(this.pos);
    const targetLook = rider.position.clone().add(new THREE.Vector3(steer * 4, 3.2, -18 - speed * .08));
    this.look.lerp(targetLook, 1 - Math.exp(-dt * 5.8));
    this.camera.lookAt(this.look);
    const targetFov = 64 + THREE.MathUtils.clamp(speed * .13, 0, 15);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-dt * 2.5));
    this.camera.updateProjectionMatrix();
  }
}
