# lumion_final — Clonador SPA com Playwright

Ferramenta de **espelhamento de site** escrita em Node.js que usa Playwright
(Chromium headless) para baixar uma SPA inteira — incluindo o JavaScript
executado, chunks dinâmicos do Next.js, e mídia de CDNs externos.

> **Uso pretendido:** estudo local fair-use de arquitetura de sites Next.js.
> O conteúdo baixado **não é versionado** (pasta `output/` está no `.gitignore`).

## Por que existe

`wget` e `HTTrack` baixam HTML estático mas perdem chunks carregados
dinamicamente via JS. Em SPAs modernas (Next.js, Nuxt, Remix), grande
parte do conteúdo só aparece **depois** que o JavaScript executa.

Esta ferramenta resolve isso abrindo a página num browser real e
**interceptando cada resposta de rede** (`page.on('response')`) — captura
tudo que o navegador realmente baixou, incluindo lazy-loads disparados por scroll.

## Pré-requisitos

- **Node 18+** e npm
- Espaço em disco: ~50 MB por site clonado

## Instalação

```bash
cd ShowRoom/lumion_final
npm install
npx playwright install chromium   # baixa o browser, ~150 MB
```

## Uso

```bash
npm run clone     # baixa o site (~30s, gera output/lumion.com/)
npm run serve     # serve em http://localhost:8080
npm run test      # roda validador automático contra o clone servido
```

## Arquivos

| Arquivo            | O que faz |
|--------------------|-----------|
| `clone.js`         | O crawler. Abre a página, escuta responses, salva tudo, reescreve URLs absolutas para caminhos locais |
| `test_render.js`   | Validador. Abre o clone local em outro browser e mede: erros de JS, requisições falhadas, vídeos tocando, número de elementos animáveis |
| `package.json`     | Scripts npm e dependências |
| `.gitignore`       | Ignora `node_modules/`, `output/`, screenshots de teste |

## Como o `clone.js` funciona — visão de 30 segundos

1. **`page.on('response')`** registra um handler **antes** do `goto`. A partir
   daí, cada resposta HTTP vira um arquivo no disco — espelhando a estrutura
   da URL.
2. Após `networkidle`, faz **scroll repetido** pra disparar lazy-loads e
   **hover na navegação** pra disparar chunks de menus.
3. Captura a **HTML SSR original** (interceptada como resposta) — não a
   versão pós-hidratação devolvida por `page.content()`. Isso é crítico:
   se você salvasse a versão hidratada, bibliotecas como AOS já estariam
   com `.aos-animate` aplicado e nunca animariam de novo ao recarregar.
4. Reescreve URLs absolutas (`https://lumion.com/...`) pra caminhos locais
   relativos. Hosts externos (CDN) vão pra `_external/<host>/`.

Cada decisão está documentada em comentário no próprio `clone.js`. Recomendado
ler o arquivo do começo ao fim — é didático.

## Estrutura gerada (`output/lumion.com/`)

```
lumion.com/
├── index.html               HTML SSR reescrita com URLs locais
├── index.rendered.html      DOM pós-hidratação (debug)
├── _next/                   Chunks JS, CSS e fontes do Next.js
│   ├── static/chunks/...
│   ├── static/css/...
│   └── static/media/...
├── _external/               Tudo que veio de outros domínios
│   ├── assets.lumion.com/
│   ├── fonts.gstatic.com/
│   └── i.ytimg.com/
├── product/, assets/, ...   Caminhos próprios do site
└── favicon/
```

## Limitações conhecidas

- Scripts de tracking de terceiros (Google Tag Manager, OneTrust) carregam
  de URLs dinâmicas — falham silenciosamente offline. Não afeta o visual.
- Embeds de YouTube tentam carregar players do `s.ytimg.com` — também falham
  offline. O thumbnail (clicado pra abrir o iframe) funciona.
- APIs `fetch()` que o site faz para serviços próprios (`services.lumion3d.net`)
  retornam erro de rede — esperado, é serviço backend que não temos como mockar.

## Adaptação para outros sites

Em `clone.js` no topo:

```js
const TARGET = 'https://lumion.com/';
```

Troque pela URL desejada. Funciona em qualquer SPA Next.js e na maioria
dos sites estáticos. Para Nuxt/Remix/SvelteKit os princípios são os mesmos
e geralmente funciona sem alteração.

## Aviso legal

Este projeto é uma ferramenta. Você é responsável por usá-la respeitando
os termos de serviço dos sites que clona e as leis de direito autoral
aplicáveis. Use para **estudo local pessoal** — não republique conteúdo
de outros como se fosse seu.
