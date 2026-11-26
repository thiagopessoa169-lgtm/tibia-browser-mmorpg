# Aetheria Online — MMORPG 2D para navegador

Protótipo da Etapa 1: vila top-down explorável, movimentação em oito direções, câmera suave, cenário procedural e HUD. Ainda é single-player; autenticação, salvamento e multiplayer serão implementados na Etapa 2.

## Executar
Abra `index.html` no navegador. Se necessário, na pasta do projeto execute `python -m http.server 8000` e acesse http://localhost:8000.

**Controles:** WASD/setas para mover; Shift para correr.

Sem build e sem dependências locais. Phaser 3.80.1 é carregado por CDN.

## Estrutura
- `index.html` — entrada do jogo
- `src/game.js` — mapa, entidades, câmera e controles
- `src/style.css` — interface responsiva
- `docs/ROADMAP.md` — etapas planejadas
- `netlify.toml` e `vercel.json` — hospedagem estática

## Roadmap
1. Base jogável no navegador (esta entrega)
2. Supabase Auth, PostgreSQL e Realtime
3. Combate, monstros, XP e PVP
4. NPCs, quests, inventário e mapas
5. Polimento, performance e deploy

A escolha prevista para o backend é Supabase, com políticas RLS e variáveis de ambiente configuradas na Etapa 2.
