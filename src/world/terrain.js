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
  const fall = z * .105;
  const corridor = -Math.exp(-Math.pow(x/125,2))*14;
  const side = THREE.MathUtils.clamp((Math.abs(x)-72)/378,0,1);
  const valleyWalls = Math.pow(side,1.55)*(48+Math.sin(z*.0037)*13);
  const asymmetricBank = Math.max(0,x-125)*.055*(.55+.45*Math.sin(z*.0021+1.4));
  return 145+fall+macro+detail+ridge+corridor+valleyWalls+asymmetricBank;
}

function snowDetailTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = 205 + Math.floor(Math.random() * 50);
    image.data[i] = n;
    image.data[i + 1] = n;
    image.data[i + 2] = Math.min(255, n + 4);
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(48, 130);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTerrain({ width = 900, length = 2600, segmentsX = 180, segmentsZ = 360 } = {}) {
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

  const normal = geo.attributes.normal;
  const colors = new Float32Array(p.count * 3);
  const snow = new THREE.Color(0xe8eeef);
  const cold = new THREE.Color(0xb9c9cf);
  const rock = new THREE.Color(0x566267);

  for (let i = 0; i < p.count; i++) {
    const slope = normal.getY(i);
    const x = p.getX(i);
    const z = p.getZ(i) - length * .38;
    const detail = fbm(x * .018, z * .018);
    let c = snow.clone().lerp(cold, THREE.MathUtils.clamp((1 - slope) * .55 + (detail - .5) * .16, 0, .42));
    const rockExposure = THREE.MathUtils.smoothstep(slope, .62, .38) * THREE.MathUtils.smoothstep(detail, .53, .76);
    c.lerp(rock, rockExposure * .8);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: snowDetailTexture(),
    vertexColors: true,
    roughness: .88,
    metalness: 0,
    sheen: .12,
    sheenColor: new THREE.Color(0xdcecff),
    sheenRoughness: .56,
    clearcoat: .025,
    clearcoatRoughness: .7
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.z = -length * .38;
  return mesh;
}
