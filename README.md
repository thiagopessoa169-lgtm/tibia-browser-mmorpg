# Aetheria Online — MMORPG 2D para navegador

Protótipo de MMORPG 2D top-down. As Etapas 1, 2, 3 e 4 foram concluídas e aprovadas. As subetapas 5.1 (polimento visual), 5.2 (performance e estabilidade) e 5.3 (experiência do jogador) foram implementadas, publicadas e aprovadas pelo usuário em 2026-11-27. A revisão final 5.4 está em andamento.

## Executar

Abra `index.html` no navegador. Se necessário, na pasta do projeto execute `python -m http.server 8000` e acesse http://localhost:8000.

**Controles:** WASD/setas para mover; Shift para correr.

Sem build e sem dependências locais. Phaser 3.80.1 e Supabase JS são carregados por CDN com versões fixadas.

## Configuração online

Siga o guia [Configurar o Supabase — Etapa 2](docs/ETAPA-2-SUPABASE.md). Sem URL/chave do Supabase, o protótipo permanece jogável em modo local. Não coloque chaves secret ou service_role no navegador.

## Estrutura

- `index.html` — entrada do jogo e interface de conta/personagens
- `src/game.js` — regiões, portais, câmera, controles e jogadores remotos
- `src/backend.js` — autenticação, personagens, presença, sincronização e chamadas ao PvP
- `src/supabase-config.js` — URL e chave publishable do projeto
- `src/style.css` — interface responsiva
- `supabase/migrations/` — SQL de tabelas e políticas RLS/Realtime
- `supabase/functions/arena-attack/`, `quest-action/` e `inventory-action/` — validação de duelos, missões e inventário no servidor
- `docs/` — roadmap e guias de configuração
- `netlify.toml` e `vercel.json` — hospedagem estática

## Roadmap

1. Base jogável no navegador (aprovada)
2. Supabase Auth, personagens, PostgreSQL e Realtime (aprovada)
3. Combate, monstros, XP e PvP (aprovada; revisão de integridade da progressão documentada no plano da Etapa 5)
4. NPCs, missões, inventário e expansão do mundo (aprovada)
5. Polimento visual, performance, experiência do jogador (5.1, 5.2 e 5.3 aprovadas; 5.4 revisão final em andamento)

Consulte [o plano da Etapa 5](docs/ETAPA-5-PLANO.md) para os resultados da auditoria de produção e os pontos de atenção pendentes.
