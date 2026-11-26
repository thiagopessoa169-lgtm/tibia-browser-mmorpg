# Roadmap — Aetheria Online

## Etapa 1 — Base do jogo
- Estrutura de repositório e hospedagem estática.
- Cena top-down com mapa procedural, vila, obstáculos e NPCs decorativos.
- Movimento em oito direções, corrida, câmera suave e HUD.
- Sem login, salvamento ou multiplayer nesta etapa.

## Etapa 2 — Backend e multiplayer
- Supabase Auth para identidade.
- PostgreSQL para personagens, atributos, inventário e progresso.
- Supabase Realtime para presença e posições com throttling.
- RLS para proteger os dados de cada jogador e validação de movimento.

## Etapa 3 — Combate e progressão
Monstros, IA básica, combate, XP, níveis e regras de PVP/zonas seguras.

## Etapa 4 — Conteúdo
NPCs interativos, diálogos, quests, inventário e novas áreas.

## Etapa 5 — Polimento e publicação
Perfil de performance, efeitos, acessibilidade e deploy final.