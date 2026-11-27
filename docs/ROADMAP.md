# Roadmap — Aetheria Online

## Etapa 1 — Base do jogo
**Status: aprovada.**
- [x] Cena top-down, vila, movimentação, câmera e HUD.

## Etapa 2 — Backend e multiplayer
**Status: aprovada.**
- [x] Supabase Auth, personagens, persistência e multiplayer Realtime.
- [x] Testes com duas sessões.

## Etapa 3 — Combate e progressão
**Status: aprovada.**
- [x] PvE, monstros, XP, níveis, morte/respawn e persistência.
- [x] PvP validado pelo servidor e restrito à arena.
- [x] Atualização direta de XP, HP, nível e HP máximo bloqueada para o cliente; gravação de progressão transferida para o servidor.
- [ ] Limitação conhecida: movimentação e simulação de combate continuam no cliente; ver plano da Etapa 5.

## Etapa 4 — Conteúdo
**Status: aprovada por completo.**
- [x] 4.1 NPCs e diálogos.
- [x] 4.2 Missões.
- [x] 4.3 Inventário e equipamentos.
- [x] 4.4 Expansão do mundo: Bosque Antigo, portais e persistência de região.

## Etapa 5 — Polimento, performance e deploy
**Status: concluída e aprovada pelo usuário em 2026-11-27.**
- [x] 5.1 Polimento visual.
- [x] 5.2 Performance e estabilidade.
- [x] 5.3 Experiência do jogador.
- [x] 5.4 Revisão, correção de progressão, auditoria de permissões e deploy.

Cada subetapa foi implementada, publicada para teste e aprovada pelo usuário. Limitações conhecidas e melhorias futuras estão registradas em `docs/ETAPA-5-PLANO.md`.
