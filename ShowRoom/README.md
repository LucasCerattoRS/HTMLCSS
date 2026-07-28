# ShowRoom

Estudos avançados de **Web moderna**: scraping com browser headless,
arquitetura de SPA (Next.js), animações disparadas por scroll, layout
responsivo mobile-first.

Dois subprojetos complementares — um *aprende lendo*, outro *aprende fazendo*.

## Subprojetos

### [`lumion_final/`](lumion_final/) — clonador de site (Playwright + Node)
Ferramenta em Node.js que abre uma página num Chromium real, intercepta
**todas as respostas de rede** e salva localmente preservando o esquema de
URLs. Útil para estudar a arquitetura interna de SPAs (Next.js, hidratação,
chunks dinâmicos, lazy-load de mídia).

> Uso **fair-use educacional**. O conteúdo baixado fica em `output/`
> (gitignored) — só na sua máquina, para leitura/análise.

[Ver detalhes →](lumion_final/README.md)

### [`studio-template/`](studio-template/) — template de site original
Site estático escrito **do zero** em HTML/CSS/JS puro, sem framework. Demonstra
os mesmos padrões que você vê em landing pages modernas (navbar fixa com
glassmorphism, hero animado, reveal on scroll, grid responsivo, contador
animado), todos comentados de forma didática.

> Código autoral. Lorem ipsum no lugar de copy. Pronto para ser adaptado
> em projetos reais.

[Ver detalhes →](studio-template/README.md)

## Por que existem juntos

- `lumion_final/` te dá uma referência **completa e real** pra leitura.
  Você abre arquivos e vê como um Next.js de produção foi montado.
- `studio-template/` é a versão **enxuta e autoral** dos mesmos padrões.
  Você adapta, modifica, e usa em projetos próprios.

A combinação é o ciclo natural de aprendizado: **inspeciona algo bem feito
no mundo real → constrói uma versão sua, simples, do mesmo princípio.**

## Pré-requisitos

| Subprojeto       | Requer            |
|------------------|-------------------|
| `lumion_final/`  | Node 18+, npm     |
| `studio-template/` | Browser moderno (qualquer navegador atualizado) |
