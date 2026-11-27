# Aetheria Online — MMORPG 2D para navegador

Protótipo de MMORPG 2D top-down. As Etapas 1, 2, 3, 4 e 5 foram concluídas e aprovadas pelo usuário. O planejamento da Etapa 6 foi aprovado em 2026-11-27; a implementação ainda não começou.

## Executar

Abra `index.html` no navegador. Se necessário, na pasta do projeto execute `python -m http.server 8000` e acesse http://localhost:8000.

**Controles:** WASD/setas para mover; Shift para correr.

Sem build e sem dependências locais. Phaser 3.80.1 e Supabase JS são carregados por CDN com versões fixadas.

## Configuração online

Siga o guia [Configurar o Supabase — Etapa 2](docs/ETAPA-2-SUPABASE.md). Sem URL/chave do Supabase, o protótipo permanece jogável em modo local. Não coloque chaves secret ou service_role no navegador.

## Estrutura

- `index.html` — entrada do jogo e interface de conta/personagens
- `src/game.js` — regiões, portais, câmera, controles e jogadores remotos
- `src/backend.js` — autenticação, personagens, presença, sincronização e chamadas ao servidor
- `src/supabase-config.js` — URL e chave publishable do projeto
- `src/style.css` — interface responsiva
- `supabase/migrations/` — SQL de tabelas e políticas RLS/Realtime
- `supabase/functions/arena-attack/`, `quest-action/`, `inventory-action/` e `progress-action/` — validação de PvP, missões, inventário e progressão
- `docs/` — roadmap e planos das etapas
- `netlify.toml` e `vercel.json` — hospedagem estática

## Roadmap

1. Base jogável no navegador (aprovada)
2. Supabase Auth, personagens, PostgreSQL e Realtime (aprovada)
3. Combate, monstros, XP e PvP (aprovada; gravação dos dados de progressão protegida pelo servidor)
4. NPCs, missões, inventário e expansão do mundo (aprovada)
5. Polimento visual, performance, experiência do jogador, revisão e deploy (concluída e aprovada)
6. Expansão do mundo e novos desafios (planejamento aprovado; execução pendente)

Consulte [o plano da Etapa 5](docs/ETAPA-5-PLANO.md) e [o plano da Etapa 6](docs/ETAPA-6-PLANO.md) para detalhes.
