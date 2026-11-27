# Etapa 3 — Combate, monstros, progressão e PVP

## Objetivo

Adicionar o primeiro ciclo de combate ao Aetheria Online sem quebrar autenticação, seleção de personagens, salvamento de posição ou multiplayer da Etapa 2.

## Escopo aprovado

- Monstros no mapa, com surgimento e respawn.
- IA básica: patrulha, detectar jogador próximo, perseguir e atacar.
- Combate com dano, HP e feedback visual.
- Ganho de experiência e evolução de nível.
- Morte e retorno do jogador ao ponto de respawn.
- PVP simples, com validações básicas.

## Decisões de implementação

1. **Combate PvE primeiro:** entregar e testar o ciclo jogador → monstro → dano → recompensa → respawn antes de ativar PVP.
2. **Área segura e arena PVP:** a vila permanece segura. O PVP só poderá acontecer em uma área claramente identificada, evitando ataques acidentais.
3. **Dados persistentes:** HP, HP máximo, nível e experiência serão salvos no personagem pelo Supabase.
4. **Compatibilidade:** manter Phaser 3.80.1, JavaScript clássico, scripts via CDN e o projeto sem etapa de build.
5. **Segurança:** validar no backend o que for possível e não expor chaves secretas no navegador. A sincronização visual por Realtime não será tratada como prova de que uma ação de combate é legítima.

## Entregas

### 3.1 — Base de combate PvE
- Criar monstros com atributos configuráveis.
- Distribuir pontos de surgimento fora da área central da vila.
- Implementar patrulha, perseguição, ataque, dano e respawn dos monstros.
- Permitir ao jogador atacar monstros e receber feedback de acerto.
- Exibir HP do jogador e dos monstros.

### 3.2 — Progressão e morte
**Status: implementação publicada, aguardando validação no navegador.**

- [x] Adicionar XP persistente à tabela de personagens, com validação no banco.
- [x] Carregar HP, HP máximo, nível e XP ao selecionar o personagem.
- [x] Salvar dano recebido, XP ganho, evolução de nível e HP máximo.
- [x] Persistir a derrota e restaurar HP e posição segura no respawn.
- [x] Restringir os privilégios da tabela e manter RLS por proprietário.
- [ ] Validar no site público, incluindo sair/entrar e reconectar depois de uma derrota.

A fórmula atual mantém o limite de XP em 100 × nível atual. Cada evolução aumenta o HP máximo em 10 pontos.

**Limite do protótipo:** o cálculo do combate ainda ocorre no navegador. A persistência guarda o estado do personagem, mas não é uma validação antifraude de combate; ações competitivas e PVP exigirão lógica autoritativa no servidor.

### 3.3 — PVP
- Criar uma arena identificada no mapa.
- Permitir dano entre jogadores somente dentro da arena.
- Verificar distância, alvo, estado do personagem e intervalo entre ataques.
- Atualizar HP e estado dos jogadores conectados.

## Critérios de aceitação

- Monstros aparecem, perseguem, atacam, podem ser derrotados e reaparecem.
- O jogador recebe dano, pode derrotar monstros e ganha XP.
- HP, XP e nível permanecem após sair e entrar novamente.
- A morte leva ao respawn sem apagar o personagem.
- Jogadores só conseguem causar dano PVP dentro da arena.
- As funcionalidades das Etapas 1 e 2 continuam funcionando com duas contas simultâneas.

## Observações

Os valores iniciais de dano, alcance, velocidade, HP, XP e tempos de recarga serão mantidos em configurações fáceis de ajustar durante os testes. Esta etapa será entregue em incrementos pequenos para facilitar a validação antes de avançar.
