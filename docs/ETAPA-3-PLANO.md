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
**Status: aprovada pelo usuário após validação no navegador.**

- [x] Adicionar XP persistente à tabela de personagens, com validação no banco.
- [x] Carregar HP, HP máximo, nível e XP ao selecionar o personagem.
- [x] Salvar dano recebido, XP ganho, evolução de nível e HP máximo.
- [x] Persistir a derrota e restaurar HP e posição segura no respawn.
- [x] Restringir os privilégios da tabela e manter RLS por proprietário.
- [x] Validar no site público, incluindo sair/entrar e reconectar depois de uma derrota.

A fórmula atual mantém o limite de XP em 100 × nível atual. Cada evolução aumenta o HP máximo em 10 pontos.

**Limite do protótipo:** o cálculo do combate ainda ocorre no navegador. A persistência guarda o estado do personagem, mas não é uma validação antifraude de combate; ações competitivas e PVP exigirão lógica autoritativa no servidor.

### 3.3 — PVP
**Status: implementação publicada, aguardando validação com duas contas.**

- [x] Criar e identificar visualmente a Arena de Aetheria na parte inferior do mapa.
- [x] Manter a vila como zona segura para duelos entre jogadores.
- [x] Criar a Edge Function `arena-attack`, que valida a sessão e a propriedade do personagem atacante.
- [x] Validar que os dois personagens estão vivos, no mesmo mapa, dentro da arena e a até 76 pixels.
- [x] Aplicar 10 pontos de dano com intervalo mínimo de 1.100 ms por personagem atacante.
- [x] Atualizar HP no banco e notificar o cliente do personagem atingido por Realtime.
- [x] Usar tabela de recarga com RLS habilitado e sem acesso direto dos clientes.
- [ ] Validar duelo com duas contas no site público, incluindo bloqueio fora da arena e atualização de HP.

**Limite de segurança do protótipo:** a decisão de aplicar dano é feita no backend, mas as posições ainda são gravadas pelo cliente. A validação de distância usa essas posições persistidas; isso não equivale a um sistema completo contra trapaças. A movimentação autoritativa poderá ser fortalecida em uma etapa posterior.

## Critérios de aceitação

- Monstros aparecem, perseguem, atacam, podem ser derrotados e reaparecem.
- O jogador recebe dano, pode derrotar monstros e ganha XP.
- HP, XP e nível permanecem após sair e entrar novamente.
- A morte leva ao respawn sem apagar o personagem.
- Jogadores só conseguem causar dano PvP dentro da arena, com validação do backend e atualização de HP em tempo real.
- As funcionalidades das Etapas 1 e 2 continuam funcionando com duas contas simultâneas.

## Observações

Os valores iniciais de dano, alcance, velocidade, HP, XP e tempos de recarga serão mantidos em configurações fáceis de ajustar durante os testes. Esta etapa será entregue em incrementos pequenos para facilitar a validação antes de avançar.
