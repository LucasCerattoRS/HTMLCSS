# HTML & CSS — Estudos e Projetos

Repositório com meus exercícios de fundamentos e projetos práticos de HTML e CSS (alguns com JavaScript pontual para interação de DOM).

## 📂 Estrutura

```
├── basic(1)/          Fundamentos: tags, semântica, primeiros layouts
├── basic(2)/          Continuação: box model, posicionamento, responsividade
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
```

## 📝 Notas

- Os projetos em `projetos/` foram consolidados a partir do antigo repositório *Front-End-Developments*.
- As imagens foram comprimidas para carregamento rápido sem perda visual perceptível.
- O `cardapio-digital/` é a versão didática e **anonimizada** de um projeto real vendido a um restaurante: dados do cliente (nome, telefone, fotos, preços) foram trocados por placeholders — o estudo preserva a técnica, comentada linha a linha. Inclui `impressao.html` dedicado a Print CSS (`@page`, unidades `mm`/`pt`, dot leaders, `print-color-adjust`).
