# Roadmap — Aetheria Online

## Etapa 1 — Base do jogo <badge>APROVADA</badge>
- Estrutura de repositório e hospedagem estática.
- Cena top-down com mapa procedural, vila, obstáculos e NPCs decorativos.
- Movimento em oito direções, corrida, câmera suave e HUD.
- Protótipo validado pelo usuário no navegador.

## Etapa 2 — Backend e multiplayer <badge>EM IMPLEMENTAÇÃO</badge>
- [x] Interface inicial de conta, cadastro e login.
- [x] Estrutura para criação e seleção de personagens.
- [x] Migração PostgreSQL com tabela de personagens e políticas RLS por proprietário.
- [x] Canal privado Supabase Realtime com Presence e Broadcast.
- [x] Sincronização de posição com limite de 10 envios por segundo e salvamento periódico.
- [ ] Criar/configurar projeto Supabase e inserir URL + chave publishable.
- [ ] Aplicar a migração SQL no projeto.
- [ ] Testar login, salvamento e multiplayer com duas contas.
- [ ] Adicionar validação autoritativa de movimento no servidor em etapa própria.

## Etapa 3 — Combate e progressão
Monstros, IA básica, combate, XP, níveis e regras de PVP/zonas seguras.

## Etapa 4 — Conteúdo
NPCs interativos, diálogos, quests, inventário e novas áreas.

## Etapa 5 — Polimento e publicação
Perfil de performance, efeitos, acessibilidade e deploy final.
