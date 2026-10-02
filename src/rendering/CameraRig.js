import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.look = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.time = 0;
  }

  update(dt,rider,state,steer) {
    this.time += dt;

    const speed = Math.abs(state.speed);
    const speed01 = THREE.MathUtils.clamp((speed-35)/85,0,1);

    const offset = new THREE.Vector3(
      -steer*(3.2+speed01*1.6),
      5.8+speed*.009+state.airborne*.9,
      10.8+speed*.026
    );

    const targetPos = rider.position.clone().add(offset);
    this.pos.lerp(targetPos,1-Math.exp(-dt*5.0));

    const shake = speed01*.075;
    this.camera.position.copy(this.pos);
    this.camera.position.x += Math.sin(this.time*19.7)*shake;
    this.camera.position.y += Math.sin(this.time*27.1)*shake*.42;

    const targetLook = rider.position.clone().add(new THREE.Vector3(
      steer*3.6,
      2.35,
      -15.5-speed*.07
    ));
    this.look.lerp(targetLook,1-Math.exp(-dt*6.4));
    this.camera.lookAt(this.look);

    const targetRoll = -steer*(.022+speed01*.038);
    this.camera.rotation.z = THREE.MathUtils.lerp(
      this.camera.rotation.z,
      targetRoll,
      1-Math.exp(-dt*5.2)
    );

    const targetFov = 58+THREE.MathUtils.clamp(speed*.10,0,12);
    this.camera.fov = THREE.MathUtils.lerp(
      this.camera.fov,
      targetFov,
      1-Math.exp(-dt*2.9)
    );
    this.camera.updateProjectionMatrix();
  }
}
