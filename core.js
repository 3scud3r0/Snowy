(function exposeSnowyCore(globalScope) {
  'use strict';

  const SURFACES = Object.freeze({
    powder: Object.freeze({ name: 'POWDER', color: '#eef5f1', grip: 0.82, damping: 0.935, maxSpeed: 78, acceleration: 0.58, carveDrag: 15 }),
    packed: Object.freeze({ name: 'COMPACTA', color: '#d9e8e5', grip: 1.15, damping: 0.91, maxSpeed: 94, acceleration: 0.72, carveDrag: 12 }),
    ice: Object.freeze({ name: 'GELO', color: '#a8d9df', grip: 0.58, damping: 0.975, maxSpeed: 112, acceleration: 0.42, carveDrag: 7 })
  });

  function surfaceAt(distance) {
    const phase = ((distance % 1850) + 1850) % 1850;
    if (phase > 1320 && phase < 1640) return SURFACES.ice;
    if (phase > 700 && phase < 1320) return SURFACES.packed;
    return SURFACES.powder;
  }

  function seededRandom(seed) {
    const nextSeed = (seed * 1664525 + 1013904223) >>> 0;
    return { seed: nextSeed, value: nextSeed / 4294967296 };
  }

  function normalizedLandingAngle(rotation) {
    return Math.abs(Math.atan2(Math.sin(rotation), Math.cos(rotation)));
  }

  function evaluateLanding(rotation, combo) {
    const angle = normalizedLandingAngle(rotation);
    const degrees = Math.round(Math.abs(rotation) / (Math.PI * 2) * 360);
    const clean = angle < 0.48;
    return { clean, angle, degrees, reward: clean ? Math.round(12 + combo * 8 + degrees * 0.08) : -35 };
  }

  function runGrade(flow, clean) {
    const adjusted = flow * (0.72 + Math.max(0, Math.min(100, clean)) * 0.0028);
    if (adjusted > 520) return 'S';
    if (adjusted > 360) return 'A';
    if (adjusted > 220) return 'B';
    return 'C';
  }

  function flowLabel(flow) {
    if (flow > 400) return 'EM SINTONIA';
    if (flow > 220) return 'LINHA CONECTADA';
    if (flow > 80) return 'RITMO CRESCENDO';
    return 'ENCONTRE O RITMO';
  }

  function evaluateObjective(run, objective) {
    const checks = {
      flow: run.flow >= (objective.flow || 0),
      clean: run.clean >= (objective.clean || 0),
      speed: run.maxSpeed >= (objective.speed || 0)
    };
    return { checks, completed: Object.values(checks).every(Boolean) };
  }

  function lineQuality(metrics) {
    const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
    const dimensions = {
      velocidade: clamp((metrics.maxSpeed || 0) / 1.12),
      precisao: clamp(metrics.clean),
      criatividade: clamp((metrics.uniqueMoves || 0) * 18 + (metrics.rotations || 0) * 4),
      risco: clamp((metrics.nearMisses || 0) * 13 + (metrics.airtime || 0) * 2.5),
      fluidez: clamp((metrics.longestCombo || 0) * 14 + (metrics.flow || 0) / 12)
    };
    const quality = Math.round(
      dimensions.velocidade * 0.18 + dimensions.precisao * 0.27 +
      dimensions.criatividade * 0.18 + dimensions.risco * 0.17 + dimensions.fluidez * 0.20
    );
    return { dimensions, quality };
  }

  const api = { SURFACES, surfaceAt, seededRandom, normalizedLandingAngle, evaluateLanding, runGrade, flowLabel, evaluateObjective, lineQuality };
  globalScope.SnowyCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
