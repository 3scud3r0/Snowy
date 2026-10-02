import * as THREE from 'three';
import { terrainHeight } from '../world/terrain.js';

export class SnowTracks {
  constructor(scene, { maxPoints = 620, width = 1.65 } = {}) {
    this.maxPoints = maxPoints;
    this.width = width;
    this.points = [];
    this.last = null;

    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(maxPoints * 2 * 3);
    this.colors = new Float32Array(maxPoints * 2 * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: .32,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending
    });

    this.geometry = geometry;
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }

  reset() {
    this.points.length = 0;
    this.last = null;
    this.geometry.setDrawRange(0, 0);
  }

  add(position, steer, airborne) {
    if (airborne) return;
    const p = new THREE.Vector3(position.x, terrainHeight(position.x, position.z) + 1.055, position.z);
    if (this.last && this.last.distanceToSquared(p) < 1.8) return;
    this.points.push({ p, steer });
    this.last = p.clone();
    if (this.points.length > this.maxPoints) this.points.shift();
    this.rebuild();
  }

  rebuild() {
    const n = this.points.length;
    if (n < 2) return;

    const indices = [];
    const dark = new THREE.Color(0x8ba0aa);
    const light = new THREE.Color(0xcbd7db);

    for (let i = 0; i < n; i++) {
      const prev = this.points[Math.max(0, i - 1)].p;
      const next = this.points[Math.min(n - 1, i + 1)].p;
      const dir = next.clone().sub(prev).setY(0).normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      const width = this.width * (.82 + Math.min(1, Math.abs(this.points[i].steer)) * .35);
      const left = this.points[i].p.clone().addScaledVector(side, width * .5);
      const right = this.points[i].p.clone().addScaledVector(side, -width * .5);

      let k = i * 6;
      this.positions[k] = left.x; this.positions[k+1] = left.y; this.positions[k+2] = left.z;
      this.positions[k+3] = right.x; this.positions[k+4] = right.y; this.positions[k+5] = right.z;

      const age = i / Math.max(1, n - 1);
      const c = dark.clone().lerp(light, age * .55);
      for (let j = 0; j < 2; j++) {
        const ck = (i * 2 + j) * 3;
        this.colors[ck] = c.r; this.colors[ck+1] = c.g; this.colors[ck+2] = c.b;
      }

      if (i < n - 1) {
        const a = i * 2, b = a + 1, c0 = a + 2, d = a + 3;
        indices.push(a, c0, b, b, c0, d);
      }
    }

    this.geometry.setIndex(indices);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, indices.length);
    this.geometry.computeBoundingSphere();
  }
}
