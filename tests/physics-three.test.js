import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceAt, flowLabel, grade } from '../src/game/physics.js';
import { terrainHeight } from '../src/world/terrain.js';

test('surface profiles cycle and retain distinct handling', () => {
  assert.equal(surfaceAt(10).name, 'POWDER');
  assert.equal(surfaceAt(800).name, 'COMPACTA');
  assert.equal(surfaceAt(1300).name, 'GELO');
  assert.ok(surfaceAt(1300).maxSpeed > surfaceAt(10).maxSpeed);
  assert.ok(surfaceAt(800).grip > surfaceAt(1300).grip);
});

test('FLOW language progresses with run quality', () => {
  assert.equal(flowLabel(0), 'ENCONTRE O RITMO');
  assert.equal(flowLabel(150), 'FLUINDO');
  assert.equal(flowLabel(320), 'EM SINTONIA');
});

test('grade rewards combined flow and clean riding', () => {
  assert.equal(grade(520, 100), 'S');
  assert.equal(grade(300, 100), 'A');
  assert.equal(grade(140, 100), 'B');
});

test('mountain has a real downhill vertical drop toward the checkpoint', () => {
  const start = terrainHeight(0, 120);
  const finish = terrainHeight(0, -1920);
  assert.ok(Number.isFinite(start));
  assert.ok(Number.isFinite(finish));
  assert.ok(finish < start - 120);
});
