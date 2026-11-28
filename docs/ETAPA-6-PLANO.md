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
**Status: aprovada pelo usuário em 2026-11-27.**
- Região original **Ruínas de Elyndor** (`ruinas-elyndor`), com paleta de pedra, caminhos, praça central, pilares, paredes e cristais.
- Portais conectam Vila de Aetheria, Bosque Antigo e Ruínas de Elyndor; cada região oferece saída para outra região.
- Criar portais de ida e volta e salvar/restaurar a região e posição do personagem.
- Persistência e carregamento reconhecem o terceiro identificador de mapa; presença e jogadores remotos continuam filtrados por região.
- A Edge Function `progress-action` reconhece o novo mapa sem habilitar recompensas de combate nele. Morte/renascimento continua retornando o personagem à vila.
- A região ainda não possui monstros, chefe, NPCs, ervas ou missões próprias; esses conteúdos permanecem nas subetapas seguintes.

### 6.2 — Novos monstros e comportamento
**Status: aprovada pelo usuário em 2026-11-27; correção visual das Fagulhas Rúnicas retestada e confirmada em 2026-11-28.**
- Ruínas: quatro inimigos em dois tipos originais — Sentinela de Pedra (mais resistente, lento e com alcance de perseguição menor) e Fagulha Rúnica (mais veloz, menos resistente e patrulha mais ampla).
- Definir surgimentos e limites de combate por região.
- Integrar dano, XP, cooldowns e persistência com validação no servidor. A migração `20261127212000_stage_6_2_ruins_monsters.sql` amplia os mapas e danos permitidos, diferenciando XP por tipo de inimigo.
- Evitar mudanças nas criaturas e recompensas já aprovadas.

### 6.3 — Chefe regional
**Status: aprovada pelo usuário em 2026-11-28.**
- Guardião de Elyndor na praça central, com 2.400 HP e barra de vida sincronizada entre jogadores.
- Duas fases: a segunda começa abaixo de 50% de vida; o impacto rúnico fica mais intenso e causa mais dano.
- Ataque do jogador e dano recebido passam pela Edge Function `progress-action` e RPCs com bloqueio de linha e cooldown no banco.
- Ataque especial com círculo de aviso e janela para sair da área antes do impacto.
- Participantes válidos que acertaram o chefe recentemente e permanecem vivos na região recebem 220 XP quando o chefe é derrotado.
- Reaparecimento global após cinco minutos; PvP continua restrito à Arena de Aetheria.
- Tabelas privadas com RLS e sem acesso direto de `anon`/ `authenticated`; operações executadas pelo servidor.
- Testar ataque, esquiva, mudança de fase, derrota, recompensa em grupo, reconexão e reaparecimento antes de aprovar.

### 6.4 — Missões e NPCs da nova região
**Status: 6.4.1 (NPCs e diálogos) aprovada pelo usuário em 2026-11-28; 6.4.2 (missões regionais) pendente.**

#### 6.4.1 — NPCs e diálogos
- Selene, arqueóloga de Elyndor, e Kael, explorador das Ruínas, aparecem na praça e usam o sistema existente de interação (E), diálogo e pausa de movimento.
- Diálogos contextualizam a história, os cristais, os perigos e o Guardião sem alterar os NPCs das regiões anteriores.

#### 6.4.2 — Missões regionais
**Status: aprovada pelo usuário em 27/11/2026.**
- Selene oferece “Memórias de Elyndor”: investigar três fragmentos rúnicos (E, próximos aos cristais) e receber 90 XP + 2 Ervas Medicinais.
- Kael oferece “Ameaça nas ruínas”: derrotar três criaturas das Ruínas e receber 120 XP + 2 Essências de Lodo.
- Progresso, eventos únicos, cooldown por ponto de surgimento, conclusão e recompensas são validados pelo Edge Function e RPC no Supabase.
- O diário mostra as duas novas missões; fragmentos já registrados permanecem coletados após sair/entrar novamente na região.
- Recompensas respeitam o limite de 20 itens da bolsa; se estiver cheia, a última ação não conclui a missão nem perde o progresso.

### 6.5 — Recompensas e equipamentos
**Status: implementada e publicada para teste/aprovação do usuário.**
- Novos itens: Cristal Rúnico e Núcleo do Guardião (materiais); Manto Rúnico (corpo); Botas do Guardião (pés); Selo de Elyndor (amuleto).
- Selene recompensa a pesquisa dos fragmentos com 90 XP, Manto Rúnico e 3 Cristais Rúnicos.
- Kael recompensa a limpeza das ruínas com 120 XP, Botas do Guardião e 1 Núcleo do Guardião.
- Cada participante elegível do chefe recebe 220 XP e o Selo de Elyndor quando houver espaço na bolsa.
- Os novos equipamentos usam os slots existentes; inventário, troca de equipamento, bolsa e recompensas são persistidos e validados no servidor.
- A bolsa continua limitada a 20 itens; recompensas de missão não são concluídas se não houver espaço suficiente.

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
