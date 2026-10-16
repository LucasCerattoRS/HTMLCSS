// Smoke test: abre cada .html em Chromium headless e confere que nenhum arquivo local
// falha ao carregar, que não há erro de JS e que nenhuma <img> ficou quebrada.
// Uso: (cd ShowRoom/lumion_final && npm install) && node smoke-test.js
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require(path.join(__dirname, 'ShowRoom/lumion_final/node_modules/playwright'))); }
catch { ({ chromium } = require('playwright')); }

(async () => {
  // Varre o sistema de arquivos (funciona fora do git e pega .html ainda não commitados).
  const files = [];
  (function varrer(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) varrer(p);
      else if (e.name.endsWith('.html')) files.push(path.relative(__dirname, p));
    }
  })(__dirname);
  files.sort();
  const browser = await chromium.launch();
  let failures = 0;
  for (const f of files) {
    const page = await browser.newPage();
    const errs = [];
    page.on('requestfailed', r => { if (r.url().startsWith('file:')) errs.push('arquivo não carregou: ' + decodeURI(r.url())); });
    page.on('pageerror', e => errs.push('erro de JS: ' + e.message));
    await page.goto('file://' + path.join(__dirname, f));
    await page.waitForTimeout(500);
    const broken = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
    broken.forEach(s => errs.push('<img> quebrada: ' + s));
    if (f === 'projetos/cafe-website/index.html') {
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.home-container')).backgroundImage);
      if (!bg.includes('home-img.jpg')) errs.push('hero sem home-img.jpg: ' + bg);
    }
    console.log(errs.length ? 'FALHA' : 'ok   ', f);
    errs.forEach(e => console.log('      ' + e));
    failures += errs.length;
    await page.close();
  }
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
