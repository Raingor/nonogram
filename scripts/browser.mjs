import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = process.env.GAME_URL || 'http://localhost:4304';
const out = fileURLToPath(new URL('../artifacts/', import.meta.url));
const key = 'bear-nonogram-save-v1';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const checks = [];
const contexts = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log('PASS', name); };
async function setup(viewport = { width: 1440, height: 900 }, extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  contexts.push(context);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  return page;
}
try {
  await mkdir(out, { recursive: true });
  const desktop = await setup();
  check('desktop loads title and board', await desktop.title().then(t => t.includes('数织')) && await desktop.locator('.cell').count() === 25);
  check('desktop has no horizontal overflow', await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('desktop shows 6 level entries', await desktop.locator('.level-item').count() === 6);
  check('desktop bear image loads', await desktop.locator('.companion img').evaluate(el => el.complete && el.naturalWidth > 0));
  await desktop.locator('[data-row="0"][data-col="0"]').click();
  check('left click fills a cell', await desktop.locator('[data-row="0"][data-col="0"]').getAttribute('class').then(v => v.includes('filled')));
  await desktop.locator('[data-row="0"][data-col="1"]').click({ button: 'right' });
  check('right click marks X', await desktop.locator('[data-row="0"][data-col="1"]').getAttribute('class').then(v => v.includes('crossed')));
  check('wrong fill shows mistake highlight', await desktop.locator('[data-row="0"][data-col="0"]').getAttribute('class').then(v => v.includes('mistake')));
  await desktop.locator('#toggle-errors').click();
  check('error toggle hides mistake highlight', await desktop.locator('[data-row="0"][data-col="0"]').getAttribute('class').then(v => !v.includes('mistake')));
  await desktop.locator('#toggle-errors').click();
  await desktop.locator('#undo').click();
  check('undo reverts last action', await desktop.locator('[data-row="0"][data-col="1"]').getAttribute('class').then(v => !v.includes('crossed')));
  await desktop.locator('[data-row="0"][data-col="0"]').focus();
  await desktop.keyboard.press('ArrowRight');
  check('arrow key moves cell focus', await desktop.locator('[data-row="0"][data-col="1"]').evaluate(el => el === document.activeElement));
  await desktop.keyboard.press('Enter');
  check('Enter fills focused cell', await desktop.locator('[data-row="0"][data-col="1"]').getAttribute('class').then(v => v.includes('filled')));
  await desktop.locator('#reset').click();
  check('reset clears board', await desktop.locator('.cell.filled').count() === 0);
  await desktop.locator('#hint').click();
  check('hint fills one correct cell', await desktop.locator('.cell.filled').count() === 1);
  check('hint fill is not a mistake', await desktop.locator('.cell.mistake').count() === 0);
  await desktop.locator('[data-level="star"]').click();
  check('level switch rebuilds star board', await desktop.locator('#board-heading').textContent().then(t => t.includes('星星糖')));
  await desktop.locator('[data-level="heart"]').click();
  const sol = [
    [0,1,1,1,0],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0],
  ];
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      if (sol[r][c]) await desktop.locator(`[data-row="${r}"][data-col="${c}"]`).click();
    }
  }
  check('completing heart shows result dialog', await desktop.locator('#result').isVisible());
  const saved = await desktop.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  check('victory persists best time in localStorage', saved && saved.completed && typeof saved.completed.heart === 'number');
  check('completion recorded count shows 1/6', await desktop.locator('.stats').textContent().then(t => t.includes('1/6')));
  await desktop.screenshot({ path: `${out}/desktop-1440.png`, fullPage: true });
  await desktop.locator('#next-level').click();
  check('next level starts fresh star board', await desktop.locator('#result').isHidden() && await desktop.locator('#board-heading').textContent().then(t => t.includes('星星糖')));
  const mobile = await setup({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  check('mobile 390 has no horizontal overflow', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.locator('[data-row="0"][data-col="0"]').tap();
  check('touch tap fills cell', await mobile.locator('[data-row="0"][data-col="0"]').getAttribute('class').then(v => v.includes('filled')));
  await mobile.screenshot({ path: `${out}/mobile-390.png`, fullPage: true });
  const small = await setup({ width: 360, height: 844 }, { isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await small.locator('[data-level="tulip"]').click();
  check('360 largest board stays within page', await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && await small.locator('.cell').count() === 100);
  check('reduced motion disables transitions', await small.locator('.cell').first().evaluate(el => getComputedStyle(el).transitionDuration === '0s'));
  await small.screenshot({ path: `${out}/mobile-360.png`, fullPage: true });
  check('no pageerror, console errors or failing resource responses', errors.length === 0);
  await writeFile(`${out}/smoke-results.json`, JSON.stringify({ base, passed: checks.length, checks, errors }, null, 2));
  console.log(`\n${checks.length} browser checks passed against ${base}. Artifacts: ${out}`);
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  if (errors.length) console.error(errors);
}
