# Etapa 4 — NPCs, missões, inventário e expansão do mundo

## Status

**Planejamento aprovado pelo usuário em 2026-11-27.** A implementação ainda não foi iniciada. Cada subetapa deverá ser iniciada somente após confirmação explícita do usuário.

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

- Interação com NPCs usando a tecla E.
- Interface de diálogo.
- NPCs com nomes, funções e personalidade.
- Primeiro NPC introdutório para orientar o jogador pelo mundo.
- Interações acessíveis e compatíveis com teclado e telas menores.

### 4.2 — Sistema de missões

- Missões iniciais de coleta e combate.
- Objetivos, progresso e estados (disponível, ativa, concluída).
- Recompensas em XP e itens.
- Lista de missões ativas e concluídas.
- Persistência e validação de progresso no Supabase.

### 4.3 — Inventário e equipamentos

- Bolsa com capacidade limitada.
- Itens empilháveis quando aplicável.
- Equipar e remover equipamentos.
- Categorias iniciais: poções, armas, armaduras e materiais.
- Persistência segura do inventário no Supabase.
- Regras de validação para impedir duplicação ou alteração indevida de itens e recompensas.

### 4.4 — Expansão do mundo

- Novas regiões exploráveis.
- Portais e transições entre mapas.
- Novos monstros e pontos de surgimento.
- Novos NPCs e áreas de missões.
- Carregamento eficiente para manter desempenho do jogo.

## Critérios de aceitação

- NPCs podem ser encontrados e usados sem interromper o movimento ou multiplayer.
- Diálogos abrem e fecham corretamente.
- Missões registram objetivos e progresso corretamente, inclusive após reconectar.
- Itens podem ser adquiridos, armazenados, equipados e removidos conforme as regras.
- Inventário e progresso não podem ser alterados livremente por outro usuário.
- Transições entre regiões mantêm o personagem e a sessão consistentes.
- Etapas 1, 2 e 3 continuam funcionando, incluindo combate PvE, salvamento de progresso e PvP somente na arena.

## Sequência de execução

1. 4.1 — NPCs e diálogos.
2. 4.2 — Missões.
3. 4.3 — Inventário e equipamentos.
4. 4.4 — Expansão do mundo.

Cada subetapa exige autorização para iniciar e validação do usuário antes da próxima.
