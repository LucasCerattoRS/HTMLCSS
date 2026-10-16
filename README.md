# HTML & CSS — Estudos e Projetos

Repositório com meus exercícios de fundamentos e projetos práticos de HTML e CSS (alguns com JavaScript pontual para interação de DOM).

## 📂 Estrutura

```
├── basic(1)/          Fundamentos: tags, semântica, primeiros layouts
├── basic(2)/          Continuação: box model, posicionamento, responsividade
├── animation(1)/      Estudo de animação CSS (keyframes, transitions)
├── login/             Tela de login animada com GSAP (bonecos que seguem o mouse; sem validação)
├── ShowRoom/          Estudos avançados
│   ├── lumion_final/      Crawler em Playwright (Node) para clonar SPAs
│   └── studio-template/   Template de site marketing escrito do zero
└── projetos/          Projetos práticos completos
    ├── animation-car/            Animação CSS de carro (keyframes e transforms)
    ├── cafe-website/             Landing page de cafeteria (HTML + CSS puro)
    ├── cardapio-digital/         Cardápio mobile-first + Print CSS (versão de estudo)
    ├── slider-tourism/           Slider de imagens de turismo (JS para navegação)
    ├── soda-ads/                 Página de anúncio animada de refrigerantes
    └── spotify-non-responsive/   Clone de interface do Spotify (layout fixo)
```

## 🎯 Projetos

| Projeto | Conceitos praticados |
|---|---|
| **login** | GSAP (`timeline`, `quickTo`, `stagger`), eventos `focus`/`blur`, ordem `mousedown` → `blur` → `click` |
| **animation-car** | `@keyframes`, `transform`, timing functions |
| **cafe-website** | Layout de landing page, tipografia, hero section |
| **cardapio-digital** | Mobile-first, `clamp()`, scroll-snap, sticky nav, filtro com data-attributes, `@page`/Print CSS, acessibilidade (`focus-visible`, `prefers-reduced-motion`) |
| **slider-tourism** | Slider com JS, transições, imagens otimizadas para web |
| **soda-ads** | Animações em camadas, blur, composição visual |
| **spotify-non-responsive** | Grid/Flexbox em layout complexo, fidelidade visual |

## 🚀 Como visualizar

Cada pasta é independente — basta abrir o `index.html` no navegador:

```bash
# exemplo
cd projetos/cafe-website
start index.html      # Windows
open index.html       # macOS
xdg-open index.html   # Linux
```

### `ShowRoom/lumion_final/`

Projeto Node.js (requer `node >= 18`), não é página estática:

```bash
cd ShowRoom/lumion_final
npm install
npm run clone     # baixa o site para estudo local (gera output/, ignorado pelo git)
npm run serve     # abre o clone localmente
```

## 📝 Notas

- Os projetos em `projetos/` foram consolidados a partir do antigo repositório *Front-End-Developments*.
- `node_modules/` e `output/` estão no `.gitignore` da raiz. O conteúdo que o
  `lumion_final/clone.js` baixa é **uso educacional local** (~49 MB de assets de
  terceiros, incluindo vídeos do CDN deles) — **não é versionado nem republicado**;
  só o código do crawler entra aqui.
- As imagens foram comprimidas para carregamento rápido sem perda visual perceptível.
- O `cardapio-digital/` é a versão didática e **anonimizada** de um projeto real vendido a um restaurante: dados do cliente (nome, telefone, fotos, preços) foram trocados por placeholders — o estudo preserva a técnica, comentada linha a linha. Inclui `impressao.html` dedicado a Print CSS (`@page`, unidades `mm`/`pt`, dot leaders, `print-color-adjust`).

## ✅ Estado

Repositório de estudo, sem build. Há um smoke test, `smoke-test.js`, que abre todos os `.html` em
Chromium headless e acusa arquivo local que não carrega, erro de JS e `<img>` quebrada:

```bash
cd ShowRoom/lumion_final && npm install && cd ../..   # traz o Playwright (precisa de Chromium instalado)
node smoke-test.js
```

Além dele, só `ShowRoom/lumion_final` tem um `npm test`, que depende de rodar o clone antes — não
executado nesta revisão. Código original
preservado como histórico; só bugs claros foram corrigidos.

## 🔧 Revisão de 08/10/2026

- `basic(2)/assets/` tinha `Imagem.png` **e** `imagem.png` (mesmo conteúdo). No Windows/macOS, que não
  diferenciam maiúsculas, o clone já saía "modificado". Ficou só `imagem.png` (a referenciada).
- `basic(2)/about.html` apontava para `assets/sobre.png`, que não existe → agora usa `imagem.png`.
- `basic(2)/index.html`: o link do Instagram mostrava ícone e texto de Twitch → ícone `instagram.png` e texto corrigidos.
- `login/script.js`: no clique em "Log In", `applyNeutral()` religava o rastreio do mouse logo depois
  de ele ser desligado, e os olhos não ficavam olhando para o botão. Ordem invertida.

## ⏳ Pendências

- `projetos/cafe-website/styles.css` (linha 77) cita `img/home-bg.jpg`, que nunca foi versionada, mas a
  regra seguinte de `.home-container` (linha 88) a sobrescreve e o hero mostra `img/home-img.jpg`, sem o
  gradiente escuro. Nenhum arquivo falha ao carregar; a primeira declaração de `background` é código morto.
- `basic(2)` linka `projects.html` e `contact.html`, que não existem (páginas do curso não feitas).
- `login`: a "respiração" (`startBreathing`) e a tensão do roxo animam `rotation` no mesmo elemento e
  brigam entre si.
- `projetos/slider-tourism/scripts.js`: cliques rápidos acumulam vários `setTimeout` de 3 s
  (falta `clearTimeout`).

## 📚 Para estudar

1. **Seletores, especificidade e BEM** — `basic(2)/styles/style.css` (classes `apresentacao__links__link`).
   Repare que a classe `aprensetacao_links_subtitulo` tem erro de digitação no HTML e no CSS, por isso
   "funciona": o CSS não valida nomes.
2. **`IntersectionObserver` em vez de evento de scroll** — `ShowRoom/studio-template/script.js`, linha 151
   (reveal) e 240 (contadores com `requestAnimationFrame`).
3. **Print CSS (`@page`, `mm`/`pt`)** — `projetos/cardapio-digital/impressao.html`, linha 172. Abra e use
   Ctrl+P para ver a diferença entre tela e papel.
4. **Carrossel trocando a ordem do DOM** — `projetos/slider-tourism/scripts.js`, `moveItemsOnClick()`:
   `appendChild` de um nó que já existe *move* o nó em vez de copiar. Compare com o índice `active` de
   `projetos/soda-ads/scripts.js`.
