/* =============================================================================
 *  test_render.js — Validador automatizado do clone offline
 * =============================================================================
 *
 *  PROPÓSITO:
 *  ----------
 *  Depois que `clone.js` baixa o site, este script abre o clone num Chromium
 *  headless e mede objetivamente se ele está funcionando como o original:
 *
 *    - Quantos erros de JavaScript ocorrem ao carregar?
 *    - Quantas requisições falharam (404, abort, conexão recusada)?
 *    - Quantos elementos têm "hint de animação" (data-aos, motion, transform)?
 *    - Os <video> estão tocando ou parados?
 *
 *  Tira ainda 3 screenshots (topo, meio, fim) que servem como verificação
 *  visual rápida.
 *
 *  PRÉ-REQUISITO:
 *  --------------
 *  O servidor estático precisa estar rodando ANTES deste script:
 *    npm run serve   # (em outro terminal)
 *
 *  Ou em background:
 *    npx http-server output/lumion.com -p 8080 &
 * ============================================================================= */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // ---------------------------------------------------------------------------
  // INSTRUMENTAÇÃO: registra ANTES de navegar para não perder eventos iniciais
  // ---------------------------------------------------------------------------
  const errors = [];
  const failures = [];

  // 'pageerror' captura exceções não tratadas no JS da página
  // (ex: ReferenceError em código que dependia de algo não baixado).
  page.on('pageerror', (err) => errors.push(err.message));

  // 'requestfailed' captura cada recurso que o browser tentou e falhou em obter
  // (404, ERR_ABORTED, ERR_CONNECTION_REFUSED, etc.). Essencial para diagnosticar
  // assets faltantes — ex: o famoso chunk `[[...slug]]` que tinha sumido.
  page.on('requestfailed', (req) =>
    failures.push(`${req.failure().errorText} ${req.url()}`)
  );

  // ---------------------------------------------------------------------------
  // EXECUÇÃO: carrega + scroll para disparar animações de seções inferiores
  // ---------------------------------------------------------------------------
  console.log('Carregando clone local...');
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(1500); // Espera animações iniciais terminarem

  // SNAPSHOT 1 — topo da página (hero, header)
  await page.screenshot({ path: 'snap_top.png' });

  console.log('Scroll para meio da página...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(2000); // Tempo para AOS animar e vídeos carregarem
  await page.screenshot({ path: 'snap_mid.png' });

  console.log('Scroll para o fim...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'snap_bottom.png' });

  // ---------------------------------------------------------------------------
  // MÉTRICAS DENTRO DA PÁGINA (rodam no contexto do browser via evaluate)
  // ---------------------------------------------------------------------------

  // Conta elementos que provavelmente fazem parte de animações:
  //   [data-aos]           → biblioteca AOS (Animate On Scroll)
  //   [class*="motion"]    → Framer Motion
  //   [class*="animate"]   → Tailwind animate-* ou classes manuais
  //   [style*="transform"] → animação inline (translate, scale, rotate)
  const animElements = await page.evaluate(() => {
    const all = document.querySelectorAll(
      '[data-aos], [class*="motion"], [class*="animate"], [style*="transform"]'
    );
    return all.length;
  });

  // Estado de cada <video>:
  //   paused=false  → está tocando (hero loops, demos)
  //   readyState 4  → HAVE_ENOUGH_DATA (suficiente para reproduzir até o fim)
  //   readyState 0  → HAVE_NOTHING (não conseguiu sequer começar — ruim)
  const videos = await page.evaluate(() =>
    Array.from(document.querySelectorAll('video')).map((v) => ({
      src: v.currentSrc || v.src,
      paused: v.paused,
      readyState: v.readyState,
    }))
  );

  // ---------------------------------------------------------------------------
  // RELATÓRIO
  // ---------------------------------------------------------------------------
  console.log('Título:', await page.title());
  console.log('Elementos com hint de animação:', animElements);
  console.log('Vídeos:', videos.length);
  videos.slice(0, 5).forEach((v) =>
    console.log(`  paused=${v.paused} ready=${v.readyState} src=${v.src.slice(-60)}`)
  );
  console.log('Erros JS:', errors.length);
  errors.slice(0, 5).forEach((e) => console.log('  -', e.slice(0, 150)));
  console.log('Requisições falhadas:', failures.length);
  failures.slice(0, 8).forEach((f) => console.log('  -', f.slice(0, 150)));

  await browser.close();
})();
