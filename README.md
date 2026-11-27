# Aetheria Online — MMORPG 2D para navegador

Protótipo de MMORPG 2D top-down. A Etapa 1 trouxe a vila explorável e a movimentação. As Etapas 1 e 2 foram aprovadas. A Etapa 3 está em desenvolvimento: combate, monstros, progressão e PVP.

## Executar

Abra `index.html` no navegador. Se necessário, na pasta do projeto execute `python -m http.server 8000` e acesse http://localhost:8000.

**Controles:** WASD/setas para mover; Shift para correr.

Sem build e sem dependências locais. Phaser 3.80.1 e Supabase JS são carregados por CDN com versões fixadas.

## Configuração online

Siga o guia [Configurar o Supabase — Etapa 2](docs/ETAPA-2-SUPABASE.md). Sem URL/chave do Supabase, o protótipo permanece jogável em modo local. Não coloque chaves secret ou service_role no navegador.

## Estrutura

- `index.html` — entrada do jogo e interface de conta/personagens
- `src/game.js` — mapa, câmera, controles e jogadores remotos
- `src/backend.js` — autenticação, personagens, presença e sincronização
- `src/supabase-config.js` — URL e chave publishable do projeto
- `src/style.css` — interface responsiva
- `supabase/migrations/` — SQL de tabelas e políticas RLS/Realtime
- `docs/` — roadmap e guias de configuração
- `netlify.toml` e `vercel.json` — hospedagem estática

## Roadmap

1. Base jogável no navegador (aprovada)
2. Supabase Auth, personagens, PostgreSQL e Realtime (em implementação)
3. Combate, monstros, XP e PVP (em desenvolvimento)
4. NPCs, quests, inventário e mapas
5. Polimento, performance e deploy

A Etapa 2 foi validada com duas contas e movimentação multiplayer funcional. Consulte [o plano da Etapa 3](docs/ETAPA-3-PLANO.md) para escopo, decisões técnicas e critérios de aceitação.
