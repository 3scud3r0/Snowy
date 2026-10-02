import * as THREE from 'three';
import { createTerrain, terrainHeight } from '../world/terrain.js';
import { createPines, createRocks, createCabin, createLift, createCheckpoint } from '../world/environment.js';
import { Rider } from '../rider/Rider.js';
import { SnowFX } from '../snow/SnowFX.js';
import { CameraRig } from '../rendering/CameraRig.js';
import { surfaceAt, grade } from './physics.js';

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9db4c4);
    this.scene.fog = new THREE.FogExp2(0xa8bac5, .00115);
    this.camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, .1, 4200);
    this.cameraRig = new CameraRig(this.camera);

    this.keys = new Set();
    this.running = false;
    this.finished = false;
    this.last = performance.now();
    this.state = { x: 0, z: 120, speed: 0, maxSpeed: 0, vx: 0, vy: 0, airborne: 0, flow: 0, clean: 100, steer: 0, distance: 0 };

    this.setupWorld();
    this.setupInput();
    this.resize();
    addEventListener('resize', () => this.resize());
    requestAnimationFrame(t => this.loop(t));
  }

  setupWorld() {
    const hemi = new THREE.HemisphereLight(0xcfe9ff, 0x33424a, 2.2);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2da, 5.2);
    sun.position.set(-220, 360, 180);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -290;
    sun.shadow.camera.right = 290;
    sun.shadow.camera.top = 290;
    sun.shadow.camera.bottom = -290;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 1050;
    sun.shadow.bias = -.00025;
    this.scene.add(sun);

    this.scene.add(createTerrain(), createPines(), createRocks(), createCabin(), createLift());
    this.checkpoint = createCheckpoint();
    this.scene.add(this.checkpoint);

    this.rider = new Rider();
    this.scene.add(this.rider.group);
    this.snow = new SnowFX(this.scene);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(3000, 32, 14),
      new THREE.MeshBasicMaterial({ color: 0xb7cad6, side: THREE.BackSide })
    );
    sky.position.y = 300;
    this.scene.add(sky);

    this.reset();
  }

  setupInput() {
    addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
    });
    addEventListener('keyup', event => {
      this.keys.delete(event.code);
      if (event.code === 'Space' && this.running && this.state.airborne === 0) this.jump();
    });
  }

  start() {
    this.reset();
    this.running = true;
    this.ui.start.classList.add('hidden');
    this.ui.finish.classList.remove('visible');
  }

  reset() {
    Object.assign(this.state, { x: 0, z: 120, speed: 0, maxSpeed: 0, vx: 0, vy: 0, airborne: 0, flow: 0, clean: 100, steer: 0, distance: 0 });
    this.finished = false;
    this.rider.group.position.set(0, terrainHeight(0, 120) + 1, 120);
    this.camera.position.set(0, this.rider.group.position.y + 11, 142);
    this.cameraRig.pos.copy(this.camera.position);
  }

  jump() {
    const s = this.state;
    s.airborne = .01;
    s.vy = 9.4 + Math.min(s.speed * .035, 3);
    s.flow += 16;
    this.ui.pop('+16');
  }

  update(dt) {
    const s = this.state;
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    const tuck = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('ArrowDown');

    s.steer = THREE.MathUtils.lerp(s.steer, steer, 1 - Math.exp(-dt * 7));
    const surface = surfaceAt(s.distance);
    const target = tuck ? surface.maxSpeed + 10 : surface.maxSpeed;
    s.speed += (target - s.speed) * Math.min(1, dt * surface.acceleration * .055);
    s.speed -= Math.abs(s.steer) * surface.drag * dt * 5.2;
    s.speed = Math.max(0, s.speed);
    s.maxSpeed = Math.max(s.maxSpeed, s.speed);

    s.vx += (s.steer * surface.grip * 17 - s.vx * 3.0) * dt;
    s.x += s.vx * dt;
    s.x = THREE.MathUtils.clamp(s.x, -145, 145);

    const dz = s.speed * dt * .92;
    s.z -= dz;
    s.distance += dz;

    const ground = terrainHeight(s.x, s.z) + 1;
    if (s.airborne > 0) {
      s.vy -= 21 * dt;
      this.rider.group.position.y += s.vy * dt;
      if (this.rider.group.position.y <= ground) {
        this.rider.group.position.y = ground;
        s.airborne = 0;
        s.vy = 0;
        s.flow += 25;
        this.ui.pop('+25');
      }
    } else {
      this.rider.group.position.y = THREE.MathUtils.lerp(this.rider.group.position.y, ground, 1 - Math.exp(-dt * 18));
    }

    this.rider.group.position.x = s.x;
    this.rider.group.position.z = s.z;
    const slopeAhead = terrainHeight(s.x, s.z - 4) - terrainHeight(s.x, s.z + 4);
    this.rider.group.rotation.x = THREE.MathUtils.lerp(this.rider.group.rotation.x, Math.atan2(slopeAhead, 8), .1);
    this.rider.setPose({ steer: s.steer, speed: s.speed, airborne: s.airborne });

    if (Math.abs(s.steer) > .22 && !s.airborne) s.flow += dt * s.speed * .065;

    this.snow.emit(this.rider.group.position, s.speed, s.steer);
    this.snow.update(dt, s.z);
    this.cameraRig.update(dt, this.rider.group, s, s.steer);

    const checkpointDistance = Math.max(0, Math.abs(this.checkpoint.userData.z - s.z));
    this.ui.update({
      speed: s.speed,
      flow: s.flow,
      distance: checkpointDistance,
      progress: 1 - checkpointDistance / 2040
    });

    if (checkpointDistance < 25 && !this.finished) this.finish();
  }

  finish() {
    this.running = false;
    this.finished = true;
    this.ui.finalGrade.textContent = grade(this.state.flow, this.state.clean);
    this.ui.finalStats.textContent = `${Math.round(this.state.maxSpeed)} KM/H · FLOW ${Math.round(this.state.flow)}`;
    this.ui.finish.classList.add('visible');
  }

  loop(now) {
    const dt = Math.min((now - this.last) / 1000, .035);
    this.last = now;
    if (this.running) this.update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
