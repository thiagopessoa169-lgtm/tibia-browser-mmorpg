# Etapa 4 — NPCs, missões, inventário e expansão do mundo

## Status

**Status: concluída e aprovada pelo usuário em 2026-11-27.** As quatro subetapas foram testadas e aprovadas.

## Objetivo

Expandir Aetheria Online com personagens não jogáveis, missões, itens/equipamentos e novas regiões, preservando os sistemas já aprovados de autenticação, personagens, multiplayer, PvE, progressão e PvP na arena.

## Decisões técnicas e limites

- Manter Phaser 3.80.1, JavaScript clássico, scripts via CDN e ausência de etapa de build.
- Preservar a compatibilidade com o deploy estático na Vercel e o Supabase existente.
- Usar Supabase com RLS e validações no backend para dados persistentes.
- Nunca expor chaves secretas ou service_role no navegador.
- Revalidar as funcionalidades anteriores após cada entrega.
- Implementar em incrementos pequenos, publicar e testar cada subetapa antes de avançar.
- Não tratar dados enviados pelo cliente como confiáveis para recompensas, inventário ou progresso competitivo.

## Entregas planejadas

### 4.1 — NPCs e diálogos

**Status: aprovada pelo usuário.**

- [x] Interação com NPCs usando a tecla E.
- [x] Interface de diálogo com botão de fechar e suporte a E/Esc.
- [x] NPCs com nomes, funções e personalidade (Mira, Ferreiro e Guarda).
- [x] NPC introdutório com orientação sobre vila, monstros e arena.
- [x] Interações acessíveis e compatíveis com teclado e telas menores.

### 4.2 — Sistema de missões

**Status: aprovada pelo usuário.**

- [x] Missão de combate: derrotar três Lodos da Floresta.
- [x] Missão de coleta: recolher três ervas em pontos fixos da vila.
- [x] Aceitação de missões com Mira e Ferreiro.
- [x] Diário com objetivos ativos e concluídos.
- [x] Progresso, eventos únicos de coleta e recompensas validados no servidor.
- [x] Recompensas de XP e materiais registradas no banco para integração ao inventário da Etapa 4.3.
- [x] Migração SQL e Edge Function `quest-action` com autenticação obrigatória.

**Limite de segurança conhecido:** a posição do personagem e o combate PvE básico ainda são simulados no cliente nesta versão. O servidor verifica a posição persistida, proximidade dos pontos de coleta/surgimento e intervalos por surgimento, além de controlar progresso e recompensas. Isso reduz duplicações e concessões diretas pelo cliente, mas ainda não constitui anti-cheat completo; a autoridade total de movimento e combate fica fora do escopo desta subetapa.

### 4.3 — Inventário e equipamentos

**Status: aprovada pelo usuário.**

- [x] Bolsa visual com capacidade indicada de 20 itens e quantidades empilháveis.
- [x] Itens iniciais: ervas medicinais, essências e equipamentos de vestimenta/acessório.
- [x] Equipar e remover itens nos espaços de corpo, pés e amuleto.
- [x] Usar erva medicinal para recuperar até 25 HP, com validação no servidor.
- [x] Recompensas das missões integradas à mesma bolsa.
- [x] Persistência segura no Supabase, com RLS e mutações feitas por Edge Function autenticada.
- [x] RPC transacional para consumo, equipar e remover, evitando duplicação de itens.

### 4.4 — Expansão do mundo

**Status: em implementação.**

- [x] Nova região explorável: Bosque Antigo.
- [x] Portais de ida e volta com persistência de região e posição.
- [x] Criaturas e NPC próprios da nova região.
- [x] Testes de transição e validação da persistência de região.
- [x] Correção de permissão para atualizar mapa e posição, preservando RLS.
- [x] Publicação e aprovação do usuário.

## Critérios de aceitação

- NPCs podem ser encontrados e usados sem interromper o movimento ou multiplayer.
- Diálogos abrem e fecham corretamente.
- Missões registram objetivos e progresso corretamente, inclusive após reconectar.
- Itens podem ser armazenados, consumidos, equipados e removidos conforme as regras.
- Inventário e progresso não podem ser alterados livremente por outro usuário.
- Transições entre regiões mantêm o personagem e a sessão consistentes.
- Etapas 1, 2 e 3 continuam funcionando, incluindo combate PvE, salvamento de progresso e PvP somente na arena.

## Sequência de execução

1. 4.1 — NPCs e diálogos (aprovada).
2. 4.2 — Missões (aprovada).
3. 4.3 — Inventário e equipamentos (aprovada).
4. 4.4 — Expansão do mundo (aprovada).

Cada subetapa exige autorização para iniciar e validação do usuário antes da próxima.
