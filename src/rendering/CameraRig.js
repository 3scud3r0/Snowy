import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.look = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.time = 0;
  }

  update(dt, rider, state, steer) {
    this.time += dt;
    const speed = Math.abs(state.speed);
    const speed01 = THREE.MathUtils.clamp((speed - 35) / 85, 0, 1);
    const offset = new THREE.Vector3(
      -steer * (4.2 + speed01 * 2.4),
      7.6 + speed * .014 + state.airborne * 1.4,
      23.5 + speed * .052
    );

    const targetPos = rider.position.clone().add(offset);
    this.pos.lerp(targetPos, 1 - Math.exp(-dt * 4.6));

    const shake = speed01 * .11;
    this.camera.position.copy(this.pos);
    this.camera.position.x += Math.sin(this.time * 19.7) * shake;
    this.camera.position.y += Math.sin(this.time * 27.1) * shake * .45;

    const targetLook = rider.position.clone().add(new THREE.Vector3(
      steer * 4.8,
      3.0,
      -23 - speed * .11
    ));
    this.look.lerp(targetLook, 1 - Math.exp(-dt * 6.1));
    this.camera.lookAt(this.look);

    const targetRoll = -steer * (.025 + speed01 * .042);
    this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, targetRoll, 1 - Math.exp(-dt * 5));

    const targetFov = 63 + THREE.MathUtils.clamp(speed * .145, 0, 17);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-dt * 2.7));
    this.camera.updateProjectionMatrix();
  }
}
