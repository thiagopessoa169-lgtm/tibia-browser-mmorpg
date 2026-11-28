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

## Etapa 6 — Expansão do mundo e novos desafios
**Status: planejamento aprovado; 6.1, 6.2 e 6.3 aprovadas pelo usuário.**
- [x] 6.1 Terceira região explorável (Ruínas de Elyndor) — aprovada.
- [x] 6.2 Novos monstros e comportamento — aprovada.
- [x] 6.3 Chefe regional — aprovado em 2026-11-28.
- [ ] 6.4 Missões e NPCs da nova região — 6.4.1 aprovada; 6.4.2 (missões regionais) implementada e publicada para teste.
- [ ] 6.5 Recompensas e equipamentos.
- [ ] 6.6 Multiplayer e balanceamento dos desafios.

Consulte [o plano da Etapa 5](ETAPA-5-PLANO.md) para auditoria e limitações conhecidas, e [o plano da Etapa 6](ETAPA-6-PLANO.md) para o escopo da expansão.
