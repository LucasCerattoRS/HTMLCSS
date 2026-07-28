/* =============================================================================
 *  clone.js — Clonador fair-use da homepage de lumion.com
 * =============================================================================
 *
 *  CONTEXTO:
 *  ---------
 *  O lumion.com é uma SPA (Single Page Application) construída em Next.js. Isso
 *  significa que o navegador recebe um HTML inicial (renderizado no servidor —
 *  SSR) e em seguida o JavaScript "hidrata" a página: monta o estado do React,
 *  carrega chunks dinâmicos sob demanda (lazy load) e dispara animações.
 *
 *  Ferramentas como `wget` ou HTTrack baixam apenas o estático — perdem chunks
 *  carregados via JS, vídeos do CDN, e dados do Next (`/_next/data/...`).
 *
 *  Por isso usamos o Playwright: ele controla um Chromium real, executa o JS,
 *  e nos permite **interceptar cada resposta de rede** para gravar em disco.
 *
 *  ESTRATÉGIA DESTE SCRIPT:
 *  ------------------------
 *  1. Abrir a página num navegador headless.
 *  2. Escutar TODAS as respostas (page.on('response')) e gravar cada uma com
 *     um caminho local que espelha a URL original.
 *  3. Forçar lazy-load com scroll repetido + hover nos itens do menu.
 *  4. Salvar duas versões da homepage:
 *       - index.html          → HTML SSR original (animações funcionam ao recarregar)
 *       - index.rendered.html → DOM pós-hidratação (estado final, sem reanimar)
 *  5. Reescrever URLs absolutas (https://lumion.com/...) para caminhos locais
 *     relativos, deixando o mirror navegável offline.
 * ============================================================================= */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// -----------------------------------------------------------------------------
// CONFIGURAÇÃO
// -----------------------------------------------------------------------------

/** URL alvo. PRIMARY_HOST = "lumion.com" — é o domínio "principal" do mirror. */
const TARGET = 'https://lumion.com/';
const PRIMARY_HOST = new URL(TARGET).host;

/**
 * Estrutura de saída:
 *   output/
 *     lumion.com/             ← raiz do site (PRIMARY_DIR)
 *       index.html            ← HTML SSR original
 *       _next/...             ← assets do Next.js
 *       _external/<host>/...  ← qualquer asset que veio de outro domínio
 *
 * Separar `_external/` evita misturar assets do CDN do YouTube, Storyblok,
 * Google Fonts, etc., com a árvore "real" do site.
 */
const OUT_DIR = path.join(__dirname, 'output');
const PRIMARY_DIR = path.join(OUT_DIR, PRIMARY_HOST);
const EXTERNAL_DIR = path.join(PRIMARY_DIR, '_external');

// -----------------------------------------------------------------------------
// ESTADO GLOBAL
// -----------------------------------------------------------------------------

/** Contadores apenas para o relatório final. */
const stats = { saved: 0, skipped: 0, failed: 0, bytes: 0 };

/**
 * Mapa URL → caminho local. Usado depois pela rewriteHtmlUrls() para descobrir
 * o que JÁ foi salvo e converter referências absolutas em relativas.
 */
const savedPaths = new Map();

/**
 * Buffer da HTML SSR ORIGINAL (a primeira resposta da página, antes do JS rodar).
 * Capturamos separadamente porque page.content() devolve o DOM PÓS-hidratação
 * — e isso é fatal para animações (ver comentário no main()).
 */
let originalIndexHtml = null;

// -----------------------------------------------------------------------------
// HELPERS DE NOMEAÇÃO DE ARQUIVO
// -----------------------------------------------------------------------------

/**
 * Sanitiza UM segmento de path (entre dois `/`) para virar nome de arquivo
 * seguro no Linux.
 *
 * IMPORTANTE: precisamos ser PERMISSIVOS, não agressivos. Erro clássico que
 * cometi na primeira versão: substituí `[`, `]`, `(`, `)` por `_`. Resultado:
 * o chunk `pages/[[...slug]]-abc.js` virou `pages/_____slug___-abc.js` no
 * disco. O navegador, ao pedir `/_next/.../pages/%5B%5B...slug%5D%5D-...`,
 * o http-server URL-decoda para `pages/[[...slug]]-...` e retorna 404.
 * Sem esse chunk, a página Next.js não hidrata corretamente → animações
 * congelam.
 *
 * Solução: decode + preservar quase tudo. Linux aceita `[]`, `()`, `,`, etc.
 * em nomes de arquivo. Só bloqueamos:
 *   - "." e ".." (path traversal)
 *   - segmento vazio
 *   - bytes nulos (\0)
 *   - barras (\) que ficam dentro do segmento — virariam novo nível de pasta
 */
function safeSegment(seg) {
  let decoded;
  try {
    decoded = decodeURIComponent(seg);
  } catch (_) {
    decoded = seg;
  }
  if (decoded === '.' || decoded === '..' || decoded === '') return '_';
  return decoded.replace(/\0/g, '_').replace(/\//g, '_');
}

/**
 * Converte uma URL absoluta no caminho ABSOLUTO em disco onde a resposta
 * será gravada. Exemplos:
 *
 *   https://lumion.com/                              → output/lumion.com/index.html
 *   https://lumion.com/_next/static/chunks/main.js   → output/lumion.com/_next/static/chunks/main.js
 *   https://assets.lumion.com/x/video.mp4            → output/lumion.com/_external/assets.lumion.com/x/video.mp4
 *   https://api.foo/bar?x=1                          → output/lumion.com/_external/api.foo/bar__x_1.html
 *
 * Detalhes:
 *   - Path terminado em "/" → adiciona "index.html" (servidor estático precisa
 *     de um arquivo, não pode listar diretório).
 *   - Querystring → vira sufixo no nome do arquivo (não dá pra gravar `?` no
 *     nome em alguns FS, e separar por query evita colisão entre versões).
 */
function urlToLocalPath(urlStr) {
  const u = new URL(urlStr);
  const isPrimary = u.host === PRIMARY_HOST;

  // Trata diretório raiz e diretórios intermediários como index.html
  let pathname = u.pathname;
  if (pathname === '' || pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  // Quebra em segmentos, sanitiza um a um (decode incluído)
  const segments = pathname.split('/').filter(Boolean).map(safeSegment);
  let filename = segments.pop() || 'index.html';

  // Querystring → sufixo seguro: "?id=1&v=2" vira "__id_1_v_2"
  if (u.search) {
    const qs = u.search.slice(1).replace(/[^\w.\-]+/g, '_');
    const dot = filename.lastIndexOf('.');
    if (dot > 0) {
      filename = filename.slice(0, dot) + '__' + qs + filename.slice(dot);
    } else {
      filename = filename + '__' + qs + '.html';
    }
  }

  // Hosts diferentes do principal vão para _external/<host>/
  const baseDir = isPrimary ? PRIMARY_DIR : path.join(EXTERNAL_DIR, u.host);
  return path.join(baseDir, ...segments, filename);
}

/**
 * Devolve um caminho RELATIVO a partir de PRIMARY_DIR (onde mora o index.html).
 * É o que vai entrar no HTML reescrito: `<script src="./_next/static/.../main.js">`.
 *
 * Por que relativo? Porque assim o mirror funciona em qualquer servidor estático,
 * em qualquer subdiretório, sem depender de URLs absolutas.
 */
function urlToRelativeFromIndex(urlStr) {
  const localAbs = urlToLocalPath(urlStr);
  let rel = path.relative(PRIMARY_DIR, localAbs).split(path.sep).join('/');
  if (!rel.startsWith('.') && !rel.startsWith('/')) rel = './' + rel;
  return rel;
}

/** Detecta se uma URL é a homepage de lumion.com (com ou sem trailing slash). */
const isHomepage = (url) => {
  const u = new URL(url);
  return u.host === PRIMARY_HOST && (u.pathname === '/' || u.pathname === '');
};

// -----------------------------------------------------------------------------
// HANDLER DE RESPOSTAS DE REDE
// -----------------------------------------------------------------------------

/**
 * Chamado pelo Playwright para CADA resposta HTTP que o navegador recebe.
 *
 * Filtros aplicados (na ordem):
 *   - Apenas http(s) — ignora data:, blob:, chrome-extension:, etc.
 *   - Ignora 3xx (redirecionamentos não têm corpo útil)
 *   - Ignora 4xx/5xx (erro)
 *   - Apenas GET (POST/PUT raramente são úteis num mirror estático)
 *
 * IMPORTANTE: salvamos `originalIndexHtml` ANTES de gravar, para preservar a
 * HTML SSR pré-hidratação. Esse é o pulo do gato deste script — é o que faz
 * as animações (AOS, transitions React, etc.) tocarem ao recarregar.
 */
async function saveResponse(response) {
  const url = response.url();
  const status = response.status();

  if (!/^https?:/i.test(url))                       { stats.skipped++; return; }
  if (status >= 300 && status < 400)                { stats.skipped++; return; }
  if (status >= 400)                                { stats.skipped++; return; }
  if (response.request().method() !== 'GET')        { stats.skipped++; return; }

  try {
    const buffer = await response.body();

    // Captura especial da home: guarda o HTML cru, sem hidratação aplicada
    if (isHomepage(url) && response.headers()['content-type']?.includes('text/html')) {
      originalIndexHtml = buffer.toString('utf-8');
    }

    const filePath = urlToLocalPath(url);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    savedPaths.set(url, filePath);
    stats.saved++;
    stats.bytes += buffer.length;
  } catch (err) {
    // Algumas respostas ficam indisponíveis (ex: aborted, body já consumido).
    // Não é fatal — só contabilizamos.
    stats.failed++;
  }
}

// -----------------------------------------------------------------------------
// FORÇA LAZY-LOAD COM SCROLL
// -----------------------------------------------------------------------------

/**
 * Rola a página até o fim em passos pequenos, dentro do contexto da página
 * (page.evaluate). Por que? Porque muitos sites usam IntersectionObserver
 * para só carregar imagens/seções quando entram na viewport.
 *
 * Sem esse scroll, capturaríamos só o que aparece no topo. O hero loop pode
 * carregar, mas vídeos de seções abaixo, imagens de feature cards, etc.,
 * permaneceriam em "lazy" e nunca seriam baixados.
 *
 * O `+ 800` no comparador é uma folga: o scrollHeight pode crescer enquanto
 * scrollamos (porque novas seções aparecem), e queremos cobrir esse delta.
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const dist = 400;
      const timer = setInterval(() => {
        const before = document.body.scrollHeight;
        window.scrollBy(0, dist);
        total += dist;
        if (total >= before + 800) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
}

// -----------------------------------------------------------------------------
// REESCRITA DE URLS NA HTML
// -----------------------------------------------------------------------------

/**
 * Pega uma string de HTML e substitui CADA URL absoluta (http:, https:, //...)
 * por seu equivalente local relativo, SE essa URL foi efetivamente salva.
 *
 * Exemplo:
 *   <script src="https://lumion.com/_next/static/chunks/main-abc.js">
 *      ↓
 *   <script src="./_next/static/chunks/main-abc.js">
 *
 * Heurística do match:
 *   1. Match exato pela URL completa (com query e fragment removidos).
 *   2. Fallback: match pela URL sem querystring (algumas URLs no HTML não
 *      têm os mesmos params da requisição interceptada).
 *
 * Se nada bater, deixa a URL original — vai falhar offline, mas é honesto:
 * indica conteúdo que de fato não foi clonado (ex: scripts de tracking).
 */
function rewriteHtmlUrls(html) {
  let out = html;
  // Regex captura: protocol-relative (//foo), http://foo, https://foo
  const absRe = /(https?:)?\/\/([\w.-]+)(\/[^\s"'<>)]*)?/g;
  out = out.replace(absRe, (match) => {
    try {
      const norm = match.startsWith('//') ? 'https:' + match : match;
      const u = new URL(norm);
      const stripped = u.href.split('#')[0];
      if (savedPaths.has(stripped)) return urlToRelativeFromIndex(stripped);
      // Fallback: ignora querystring e tenta de novo
      const noQuery = stripped.split('?')[0];
      for (const saved of savedPaths.keys()) {
        if (saved.split('?')[0] === noQuery) return urlToRelativeFromIndex(saved);
      }
    } catch (_) { /* URL malformada — deixa como está */ }
    return match;
  });
  return out;
}

// -----------------------------------------------------------------------------
// MAIN — PIPELINE COMPLETO
// -----------------------------------------------------------------------------

(async () => {
  // PASSO 0 — Limpa output antigo. Garante que cada execução parte do zero
  // e evita que arquivos órfãos de uma run anterior continuem no mirror.
  if (fs.existsSync(PRIMARY_DIR)) {
    fs.rmSync(PRIMARY_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(PRIMARY_DIR, { recursive: true });

  console.log('[1/5] Iniciando navegador...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    // Viewport "desktop comum" — afeta media queries e qual layout o site serve.
    viewport: { width: 1440, height: 900 },
    // UA real para evitar variações de bot-detection que escondem conteúdo.
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  });
  const page = await context.newPage();

  // O CORAÇÃO DO SCRIPT: registra o handler ANTES do goto.
  // Cada resposta passa por saveResponse. Sem isso, perderíamos os primeiros
  // recursos (CSS crítico, fontes, hero-image) que carregam em paralelo ao HTML.
  page.on('response', saveResponse);

  console.log('[2/5] Carregando', TARGET);
  // 'networkidle' = espera 500ms sem requisições. Bom sinal de "página estável".
  // Timeout generoso porque a home tem muitos vídeos pesados.
  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 90_000 });

  console.log('[3/5] Scroll repetido para disparar lazy-load e chunks dinâmicos...');
  // Três passes: a primeira pode disparar carga de novos conteúdos que
  // aumentam scrollHeight; passes seguintes alcançam o que apareceu.
  for (let i = 0; i < 3; i++) {
    await autoScroll(page);
    await page.waitForTimeout(1500);
  }
  // Volta pro topo para que o estado final do DOM (em index.rendered) reflita
  // a vista inicial, não o fim da página.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  console.log('[4/5] Hover na navegação para forçar chunks de menus...');
  // Menus dropdown costumam carregar chunks só ao hover. Pegamos os primeiros
  // 10 links do header — limite arbitrário, evita 1min de hover em links repetidos.
  const navLinks = await page.locator('header a, nav a').all();
  for (const link of navLinks.slice(0, 10)) {
    try { await link.hover({ timeout: 800 }); } catch (_) { /* link invisível, ignora */ }
  }
  // Espera mais um networkidle: hovers podem ter disparado fetches.
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('[5/5] Salvando HTML SSR original (preserva animações) + reescrevendo URLs...');

  // ============================================================
  // POR QUE DUAS HTMLs?
  // ------------------------------------------------------------
  // index.html (SSR original):
  //   - É o que lumion.com mandou na primeira resposta.
  //   - NÃO tem ainda classes injetadas pela hidratação (ex: `.aos-animate`).
  //   - Quando você abre essa HTML no navegador, o JS roda do zero, AOS
  //     observa os elementos, scroll dispara as animações → tudo funciona.
  //
  // index.rendered.html (page.content()):
  //   - É o DOM no estado em que o Playwright o deixou: já hidratado, com
  //     animações finalizadas, classes `.aos-animate` aplicadas etc.
  //   - Útil para inspeção/debug ("o que essa div virou após o JS rodar?"),
  //     mas RUIM como página principal — AOS vê os elementos já marcados
  //     como animados e pula a animação.
  //
  // Por isso o index.html canônico é o SSR original.
  // ============================================================

  // Fallback defensivo: se por algum motivo o handler não pegou a HTML inicial
  // (raríssimo), recorre ao DOM hidratado.
  if (!originalIndexHtml) {
    originalIndexHtml = await page.content();
  }
  const rewritten = rewriteHtmlUrls(originalIndexHtml);
  fs.writeFileSync(path.join(PRIMARY_DIR, 'index.html'), rewritten);

  // Salva também a versão hidratada como referência.
  const renderedHtml = await page.content();
  fs.writeFileSync(path.join(PRIMARY_DIR, 'index.rendered.html'), rewriteHtmlUrls(renderedHtml));

  await browser.close();

  // -----------------------------------------------------------
  // RELATÓRIO
  // -----------------------------------------------------------
  const mb = (stats.bytes / 1024 / 1024).toFixed(2);
  console.log('---');
  console.log(`Salvos:    ${stats.saved} arquivos (${mb} MB)`);
  console.log(`Pulados:   ${stats.skipped}`);
  console.log(`Falhados:  ${stats.failed}`);
  console.log(`Saída:     ${PRIMARY_DIR}`);
  console.log(`index.html          = HTML SSR original (animações funcionam)`);
  console.log(`index.rendered.html = DOM pós-hidratação (estado final)`);
  console.log(`Abrir:     npm run serve  (http://localhost:8080)`);
})();
