import * as THREE from 'three';

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function smooth(t) { return t * t * (3 - 2 * t); }
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = smooth(xf), v = smooth(zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
}
function fbm(x, z) {
  let total = 0, amplitude = .5, frequency = 1;
  for (let i = 0; i < 5; i++) {
    total += noise(x * frequency, z * frequency) * amplitude;
    amplitude *= .5;
    frequency *= 2.02;
  }
  return total;
}
export function terrainHeight(x, z) {
  const macro = (fbm(x * .0022, z * .0020) - .5) * 78;
  const detail = (fbm(x * .008, z * .008) - .5) * 16;
  const ridge = Math.abs(Math.sin(x * .0052 + z * .0016)) * 9;
  const fall = -z * .105;
  const corridor = -Math.exp(-Math.pow(x / 150, 2)) * 11;
  return 145 + fall + macro + detail + ridge + corridor;
}
export function createTerrain({ width = 900, length = 2600, segmentsX = 160, segmentsZ = 320 } = {}) {
  const geo = new THREE.PlaneGeometry(width, length, segmentsX, segmentsZ);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const localZ = p.getZ(i);
    const worldZ = localZ - length * .38;
    p.setY(i, terrainHeight(x, worldZ));
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xeef3f1, roughness: .88, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.z = -length * .38;
  return mesh;
}
