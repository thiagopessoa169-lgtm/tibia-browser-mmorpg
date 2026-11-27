# Etapa 6 — Expansão do mundo e novos desafios

## Status geral
**Planejamento aprovado pelo usuário em 2026-11-27.** A execução será incremental. Nenhuma funcionalidade desta etapa é considerada implementada até ser publicada, testada e aprovada.

## Objetivo
Ampliar Aetheria Online com uma terceira região explorável, novos monstros, um chefe regional, missões e recompensas inéditas, mantendo o multiplayer e a compatibilidade com os sistemas já aprovados.

## Diretrizes técnicas
- Preservar Phaser 3.80.1, JavaScript clássico, execução sem build e hospedagem estática na Vercel.
- Preservar Supabase Auth, RLS, Edge Functions, persistência e multiplayer Realtime.
- Validar no servidor toda recompensa, dano persistido, conclusão de missão e alteração de inventário.
- Nunca confiar em valores de XP, itens, HP ou posição enviados pelo navegador sem validação.
- Manter PvP restrito à Arena de Aetheria; novas regiões não se tornam zonas PvP automaticamente.
- Testar login, troca de região, persistência, multiplayer, missões, inventário e progressão já existentes após cada entrega.
- Cada subetapa será publicada para teste e só avançará após aprovação explícita do usuário.

## Subetapas planejadas

### 6.1 — Terceira região explorável
**Status: planejada; aguardando início da implementação.**
- Criar um terceiro mapa com identidade visual própria, terreno, caminhos, obstáculos e pontos de interesse.
- Definir nome, ambientação e pontos de entrada/saída.
- Criar portais de ida e volta e salvar/restaurar a região e posição do personagem.
- Atualizar presença e filtragem de jogadores remotos para respeitar a nova região.
- Garantir que o personagem não seja enviado para uma região inválida e que morte/renascimento continue seguro.
- Não incluir ainda o chefe ou sistemas de missões específicos desta região; ficam para subetapas posteriores.

### 6.2 — Novos monstros e comportamento
- Criar novos tipos de inimigos com atributos e comportamento distintos.
- Definir surgimentos e limites de combate por região.
- Integrar dano, XP, cooldowns e persistência com validação no servidor.
- Evitar mudanças nas criaturas e recompensas já aprovadas.

### 6.3 — Chefe regional
- Criar um chefe original com barra de vida, fases e ataques especiais legíveis.
- Controlar dano, recompensas e intervalo de reaparecimento no servidor.
- Evitar que jogadores fora da região ou sem participação válida recebam recompensas.
- Testar combate em grupo e reconexão.

### 6.4 — Missões e NPCs da nova região
- Adicionar NPCs e diálogos próprios.
- Criar objetivos de exploração, coleta e combate.
- Registrar progresso e conclusão no servidor.
- Integrar recompensas ao diário e inventário existentes.

### 6.5 — Recompensas e equipamentos
- Adicionar itens, materiais e equipamentos temáticos.
- Integrar itens ao inventário, slots e ações já existentes.
- Validar concessão, consumo e equipamento no servidor.
- Garantir persistência após logout/login.

### 6.6 — Multiplayer e balanceamento dos desafios
- Testar exploração e combate cooperativo entre jogadores.
- Ajustar vida, dano, frequência de surgimento e recompensas com base nos testes.
- Verificar presença, sincronização, troca de região e recuperação de desconexão.
- Preservar a regra de PvP somente na arena.

## Critérios gerais de aceitação
- A terceira região pode ser acessada e abandonada por portais, sem perder posição ou progresso.
- Jogadores online veem apenas personagens da mesma região e a presença é atualizada corretamente.
- Novos inimigos e chefe não concedem XP, itens ou dano persistido por chamadas inválidas.
- Missões, inventário e recompensas permanecem consistentes após reconectar.
- A Vila de Aetheria, o Bosque Antigo, as missões atuais, o inventário, a progressão e a Arena continuam funcionando.
- Nenhuma subetapa é marcada como aprovada sem teste do usuário.

## Sequência de execução
1. 6.1 — Terceira região explorável.
2. 6.2 — Novos monstros e comportamento.
3. 6.3 — Chefe regional.
4. 6.4 — Missões e NPCs da nova região.
5. 6.5 — Recompensas e equipamentos.
6. 6.6 — Multiplayer e balanceamento.

As ideias de nome e ambientação da terceira região serão definidas durante a implementação de 6.1 e registradas antes de publicar para teste.
