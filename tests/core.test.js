'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { evaluateLanding, evaluateObjective, flowLabel, lineQuality, runGrade, seededRandom, surfaceAt } = require('../core.js');

test('surfaceAt cycles through distinct handling profiles', () => {
  assert.equal(surfaceAt(0).name, 'POWDER');
  assert.equal(surfaceAt(900).name, 'COMPACTA');
  assert.equal(surfaceAt(1450).name, 'GELO');
  assert.equal(surfaceAt(1850).name, 'POWDER');
  assert.ok(surfaceAt(1450).maxSpeed > surfaceAt(0).maxSpeed);
  assert.ok(surfaceAt(900).grip > surfaceAt(1450).grip);
});

test('seededRandom is deterministic and remains normalized', () => {
  const first = seededRandom(87241);
  const repeated = seededRandom(87241);
  assert.deepEqual(first, repeated);
  assert.ok(first.value >= 0 && first.value < 1);
  assert.notEqual(seededRandom(first.seed).value, first.value);
});

test('landing evaluation rewards alignment and technical rotation', () => {
  const straight = evaluateLanding(0.1, 0);
  const fullSpin = evaluateLanding(Math.PI * 2, 3);
  const sideways = evaluateLanding(Math.PI / 2, 2);
  assert.equal(straight.clean, true);
  assert.equal(fullSpin.clean, true);
  assert.ok(fullSpin.reward > straight.reward);
  assert.equal(sideways.clean, false);
  assert.equal(sideways.reward, -35);
});

test('grade and FLOW language communicate run quality', () => {
  assert.equal(runGrade(600, 100), 'S');
  assert.equal(runGrade(380, 100), 'A');
  assert.equal(runGrade(240, 100), 'B');
  assert.equal(runGrade(100, 100), 'C');
  assert.equal(runGrade(380, 0), 'B');
  assert.equal(flowLabel(401), 'EM SINTONIA');
  assert.equal(flowLabel(0), 'ENCONTRE O RITMO');
});

test('objectives require skill dimensions rather than FLOW alone', () => {
  const objective = { flow: 300, clean: 70, speed: 90 };
  assert.equal(evaluateObjective({ flow: 340, clean: 80, maxSpeed: 95 }, objective).completed, true);
  const result = evaluateObjective({ flow: 900, clean: 45, maxSpeed: 110 }, objective);
  assert.equal(result.completed, false);
  assert.deepEqual(result.checks, { flow: true, clean: false, speed: true });
});

test('line quality values balanced riding over empty score chasing', () => {
  const complete = lineQuality({ maxSpeed: 104, clean: 92, uniqueMoves: 4, rotations: 3, nearMisses: 5, airtime: 12, longestCombo: 6, flow: 500 });
  const scoreOnly = lineQuality({ maxSpeed: 60, clean: 20, uniqueMoves: 1, rotations: 0, nearMisses: 0, airtime: 0, longestCombo: 1, flow: 1000 });
  assert.ok(complete.quality > scoreOnly.quality);
  assert.deepEqual(Object.keys(complete.dimensions), ['velocidade', 'precisao', 'criatividade', 'risco', 'fluidez']);
  Object.values(complete.dimensions).forEach((value) => assert.ok(value >= 0 && value <= 100));
});
