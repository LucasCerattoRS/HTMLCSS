/* ============================================================================
 * script.js — Studio Template
 * ============================================================================
 *
 * Vanilla JavaScript. Sem dependências. Sem build step. Roda direto no browser.
 *
 * QUATRO COMPORTAMENTOS, cada um numa IIFE (Immediately Invoked Function
 * Expression). Por que IIFE?
 *
 *   - Encapsula variáveis: nada vaza pra escopo global (window.*)
 *   - Isolamento de erros: se um bloco quebra, os outros continuam rodando
 *   - Auto-execução: roda assim que é definido, sem precisar chamar
 *
 *   Sintaxe: (function nome() { ... })();
 *            └─────── função ──────┘ └ chama imediatamente ┘
 *
 * Os blocos:
 *   1. navOnScroll       → muda visual da navbar quando rola além de N pixels
 *   2. navMobileToggle   → abre/fecha menu hambúrguer em mobile
 *   3. revealOnScroll    → fade-in/slide-up de elementos ao entrar na viewport
 *   4. animatedCounters  → contagem animada dos números em <Stats>
 *
 * MODO DEFENSIVO:
 *   Cada bloco testa se os elementos esperados existem no DOM. Se não existem,
 *   sai sem erro. Isso permite reutilizar o script.js em páginas que tenham
 *   só algumas dessas seções, sem quebrar.
 * ========================================================================== */


/* ============================================================================
 * 1. NAVBAR ON SCROLL — transparente → sólida ao rolar
 * ============================================================================
 *
 * COMO FUNCIONA:
 *   - Escutamos o evento 'scroll' da window
 *   - Quando window.scrollY > THRESHOLD, mudamos data-state="solid"
 *   - O CSS lê data-state e aplica background com blur
 *
 * POR QUE 'passive: true'?
 *   Por padrão, o browser ESPERA o handler de scroll terminar pra ver se ele
 *   chamou e.preventDefault(). Isso atrasa a renderização.
 *   passive:true promete "não vou cancelar" — o browser pode rolar de imediato.
 *   Em mobile, isso é a diferença entre 60fps suave e travado.
 * ========================================================================== */
(function navOnScroll() {
  const nav = document.getElementById('topNav');
  if (!nav) return;

  /** Pixels de scroll antes da navbar virar sólida. Ajuste ao gosto. */
  const SCROLL_THRESHOLD = 50;

  function update() {
    nav.dataset.state = window.scrollY > SCROLL_THRESHOLD ? 'solid' : 'transparent';
  }

  window.addEventListener('scroll', update, { passive: true });

  // Roda uma vez no carregamento — caso o usuário tenha aberto a página já
  // com scroll preservado (refresh num ponto qualquer da página).
  update();
})();


/* ============================================================================
 * 2. MOBILE MENU TOGGLE
 * ============================================================================
 *
 * Em mobile, o menu fica escondido até clicarem no hambúrguer. Aqui:
 *   - clique no toggle → abre/fecha
 *   - clique num link → fecha (UX: depois de navegar não faz sentido continuar aberto)
 *   - aria-expanded é atualizado para acessibilidade
 *
 * Acessibilidade nota: aria-expanded informa ao leitor de tela se o menu
 * está visível. Sem isso, usuário cego não sabe se clicou ou não.
 * ========================================================================== */
(function navMobileToggle() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.contains('is-open');
    setOpen(!isOpen);
  });

  // Ao clicar num link, fecha o menu. Delegação de evento: um listener no
  // pai trata cliques de qualquer filho — mais barato que listener por link.
  menu.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') setOpen(false);
  });

  // Fecha menu se a tela ficar grande (usuário rotacionou ou redimensionou).
  // Sem isso, o menu mobile aberto fica esquisito quando vira desktop.
  const desktopBreakpoint = window.matchMedia('(min-width: 768px)');
  desktopBreakpoint.addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
})();


/* ============================================================================
 * 3. REVEAL ON SCROLL — IntersectionObserver
 * ============================================================================
 *
 * PROBLEMA: queremos animar elementos quando entram na viewport.
 *
 * SOLUÇÃO RUIM (antiga):
 *   window.addEventListener('scroll', () => {
 *     elements.forEach(el => {
 *       const rect = el.getBoundingClientRect();
 *       if (rect.top < window.innerHeight) el.classList.add('is-visible');
 *     });
 *   });
 *
 *   Por que ruim? getBoundingClientRect() em CADA scroll causa "layout
 *   thrashing" — o browser recalcula posição de todos os elementos a cada
 *   pixel rolado. Em página com 50+ elementos animados, mata performance.
 *
 * SOLUÇÃO BOA: IntersectionObserver
 *   - API nativa do browser, otimizada internamente
 *   - Notifica APENAS quando elementos cruzam um threshold de visibilidade
 *   - Sem custo quando nada está mudando
 *   - Suporte universal hoje: Chrome 51+, FF 55+, Safari 12.1+, Edge 15+
 *
 * threshold: que % do elemento precisa estar visível pra disparar.
 *   0    = primeiro pixel visível
 *   0.5  = 50% visível
 *   1    = totalmente visível
 *
 * rootMargin: ajusta a "viewport efetiva". '-50px 0px' = só dispara quando
 * o elemento está 50px DENTRO da tela (bottom). Dá uma sensação mais natural
 * de "as coisas aparecem quando você chega nelas, não antes".
 * ========================================================================== */
(function revealOnScroll() {
  const elements = document.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  // Fallback pra browsers MUITO antigos sem IntersectionObserver:
  // mostra tudo de cara em vez de deixar invisível pra sempre.
  if (typeof IntersectionObserver === 'undefined') {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const delay = parseInt(el.dataset.revealDelay || '0', 10);

      // setTimeout cria a "cascata": múltiplos elementos com delays diferentes
      // entram em sequência, criando ritmo visual em vez de tudo aparecer junto.
      setTimeout(() => el.classList.add('is-visible'), delay);

      // Para de observar — animação de entrada toca uma única vez.
      // Se quisesse efeito de "esconder ao sair", removeria o unobserve e
      // trocaria classList.add por classList.toggle('is-visible', isIntersecting).
      observer.unobserve(el);
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px',
  });

  elements.forEach((el) => observer.observe(el));
})();


/* ============================================================================
 * 4. ANIMATED COUNTERS — números que sobem ao entrar na tela
 * ============================================================================
 *
 * ESTRATÉGIA:
 *   1. Observa elementos com [data-counter="N"]
 *   2. Quando entram na viewport, dispara animação de 0 a N
 *   3. Anima usando requestAnimationFrame (RAF) — sincroniza com o monitor
 *
 * POR QUE requestAnimationFrame e não setInterval?
 *   - setInterval(fn, 16) tenta ~60fps mas drift acumula erro
 *   - rAF chama fn EXATAMENTE antes de cada repaint do browser
 *   - rAF para automaticamente em abas em background (economia de bateria)
 *   - rAF passa um timestamp preciso (DOMHighResTimeStamp)
 *
 * EASING:
 *   easeOutQuart = 1 - (1-t)^4
 *   Começa rápido, desacelera no fim. Sensação de "aterrissagem suave".
 *   Curva: ████████████░░░░░  (rápido) → ░░░░████ (lento)
 *
 *   Outras curvas comuns:
 *     easeInQuad      → t * t              (acelera)
 *     easeOutCubic    → 1 - (1-t)^3        (desacelera mais suave)
 *     easeInOutCubic  → 3t² - 2t³          (S-curve)
 * ========================================================================== */
(function animatedCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  /** Duração total da contagem (ms). */
  const DURATION = 1500;

  /** Easing function — t vai de 0 a 1, retorna progresso ajustado. */
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  function animate(el) {
    const target = parseInt(el.dataset.counter, 10);
    if (Number.isNaN(target)) return;

    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const linearProgress = Math.min(elapsed / DURATION, 1);
      const easedProgress = easeOutQuart(linearProgress);

      // toLocaleString formata número com separadores do locale do usuário.
      // Em pt-BR: 2400 → "2.400". Em en-US: 2400 → "2,400".
      el.textContent = Math.floor(target * easedProgress).toLocaleString();

      // Continua até chegar em 1.0 (DURATION ms decorridos).
      if (linearProgress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  if (typeof IntersectionObserver === 'undefined') {
    counters.forEach((el) => {
      el.textContent = parseInt(el.dataset.counter, 10).toLocaleString();
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach((el) => observer.observe(el));
})();


/* ============================================================================
 * BÔNUS DIDÁTICO: como você poderia EXPANDIR este script
 * ============================================================================
 *
 *  - Theme switcher: <button id="themeToggle"> que troca [data-theme] no <html>,
 *    com CSS variables redefinidas em [data-theme="light"]. Persistir em
 *    localStorage.getItem('theme').
 *
 *  - Smooth scroll customizado: o CSS scroll-behavior:smooth basta na maioria
 *    dos casos. Se precisar offset por causa de navbar fixa:
 *      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
 *      window.scrollBy(0, -navHeight);
 *
 *  - Lazy-load de imagens: simples com loading="lazy" no HTML. Pra vídeos
 *    use IntersectionObserver pra setar src só quando entrar na viewport
 *    (vídeos grandes não devem carregar até serem precisos).
 *
 *  - Form com fetch + estado: addEventListener('submit', ...) → preventDefault,
 *    fetch('/api', { method: 'POST', body: ... }), atualizar UI conforme
 *    resposta. Sempre tratar { ok: false } e network errors.
 * ========================================================================== */
