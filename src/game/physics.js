export const SURFACES = Object.freeze({
  powder: Object.freeze({ name: 'POWDER', grip: 0.82, drag: 0.80, acceleration: 17, maxSpeed: 82 }),
  packed: Object.freeze({ name: 'COMPACTA', grip: 1.08, drag: 0.52, acceleration: 21, maxSpeed: 104 }),
  ice: Object.freeze({ name: 'GELO', grip: 0.46, drag: 0.30, acceleration: 24, maxSpeed: 118 })
});

export function surfaceAt(distance) {
  const phase = ((distance % 1500) + 1500) % 1500;
  if (phase < 650) return SURFACES.powder;
  if (phase < 1120) return SURFACES.packed;
  return SURFACES.ice;
}

export function flowLabel(flow) {
  if (flow >= 500) return 'TRANSCENDENTE';
  if (flow >= 300) return 'EM SINTONIA';
  if (flow >= 120) return 'FLUINDO';
  return 'ENCONTRE O RITMO';
}

export function grade(flow, clean) {
  const score = flow + clean * 2.1;
  if (score >= 690) return 'S';
  if (score >= 500) return 'A';
  if (score >= 330) return 'B';
  return 'C';
}
