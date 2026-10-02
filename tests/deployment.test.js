'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

test('web manifest is a valid installable application manifest', () => {
  const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
});

test('service worker precaches every required game shell file', () => {
  const worker = readFileSync('sw.js', 'utf8');
  ['index.html', 'styles.css', 'core.js', 'script.js', 'manifest.webmanifest'].forEach((asset) => {
    assert.match(worker, new RegExp(asset.replace('.', '\\.')));
  });
});

test('GitHub Pages workflow validates before deploying', () => {
  const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /needs: test/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /environment:\s+name: github-pages/);
});
