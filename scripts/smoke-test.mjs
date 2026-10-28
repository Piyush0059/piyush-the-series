import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('index.html', 'utf8');
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');

assert.match(html, /<title>Piyush Kumar — The Series<\/title>/, 'Page title should be present');
assert.match(html, /<meta name="description"/, 'SEO description should be present');
assert.match(html, /id="main"/, 'Skip link target should exist');
assert.match(html, /id="projects"/, 'Projects section should exist');
assert.match(html, /id="contact"/, 'Contact section should exist');
assert.match(workflow, /actions\/deploy-pages@v4/, 'GitHub Pages deploy action should be configured');
assert.match(workflow, /branches: \["main"\]/, 'Push to main should trigger deployment');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
assert.equal(duplicates.length, 0, `Duplicate HTML IDs: ${duplicates.join(', ')}`);

const jsBlocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(jsBlocks.length, 1, 'Expected a single inline application script');
new vm.Script(jsBlocks[0][1], { filename: 'inline-portfolio.js' });

const js = jsBlocks[0][1];
const idRefs = [...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
const missingIds = [...new Set(idRefs.filter((id) => !ids.includes(id)))];
assert.equal(missingIds.length, 0, `JS references missing IDs: ${missingIds.join(', ')}`);

const anchorTargets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const missingTargets = [...new Set(anchorTargets.filter((id) => !ids.includes(id)))];
assert.equal(missingTargets.length, 0, `Broken in-page anchors: ${missingTargets.join(', ')}`);

const cards = [...html.matchAll(/data-project="([^"]+)"/g)].map((m) => m[1]);
const projectsBlock = js.match(/var projects=\{([\s\S]*?)\n\};\nfunction showToast/);
assert.ok(projectsBlock, 'Project case-study data should exist');
const projectKeys = [...projectsBlock[1].matchAll(/^\s*([a-z]+):\{/gm)].map((m) => m[1]);
assert.equal(cards.length, 6, 'Expected six project cards');
assert.deepEqual([...cards].sort(), [...projectKeys].sort(), 'Each card must have a matching case-study entry');

const projectUrls = [...projectsBlock[1].matchAll(/url:'(https:\/\/github\.com\/Piyush0059\/[^']+)'/g)].map((m) => m[1]);
assert.equal(projectUrls.length, 6, 'Each project should link to its source repository');
assert.ok(projectUrls.every((url) => url.startsWith('https://github.com/Piyush0059/')), 'Project URLs should belong to Piyush0059');

const imagePath = 'assets/piyush-casual.webp';
assert.ok(existsSync(imagePath), 'Existing portfolio portrait should be stored in this repository');
const img = readFileSync(imagePath);
assert.equal(img.toString('ascii', 0, 4), 'RIFF', 'Portrait should be a valid WebP file');
assert.equal(img.toString('ascii', 8, 12), 'WEBP', 'Portrait should be a valid WebP file');
const localImageRefs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((src) => src === imagePath);
assert.ok(localImageRefs.length >= 2, 'Hero and About should use the existing portfolio portrait locally');

assert.match(html, /prefers-reduced-motion:\s*reduce/, 'Reduced-motion support should exist');
assert.match(html, /@media\(max-width:720px\)/, 'Tablet/mobile responsive styles should exist');
assert.match(html, /id="mobileToggle"/, 'Mobile navigation toggle should exist');
assert.match(html, /id="switchProfileMobile"/, 'Mobile profile switch should exist');

console.log(JSON.stringify({
  status: 'passed',
  htmlIds: ids.length,
  jsIdReferences: new Set(idRefs).size,
  anchorTargets: new Set(anchorTargets).size,
  projects: cards.length,
  localPortraitReferences: localImageRefs.length,
  checks: ['HTML IDs', 'JavaScript syntax', 'internal anchors', 'project-card mappings', 'project links', 'local WebP asset', 'responsive and reduced-motion hooks', 'Pages workflow']
}, null, 2));
