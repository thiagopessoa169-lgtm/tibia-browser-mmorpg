# Etapa 5 — Polimento visual, performance e deploy

## Status geral
**Planejamento aprovado pelo usuário em 2026-11-27.** A subetapa 5.1 foi autorizada e está em implementação. As subetapas seguintes dependem da validação da anterior.

## Objetivo
Refinar a apresentação e a experiência de Aetheria Online sem alterar regras de combate, progressão, inventário, missões, autenticação ou persistência já aprovadas.

## Decisões técnicas
- Manter Phaser 3.80.1, JavaScript clássico e hospedagem estática.
- Preservar as APIs e integrações atuais com Supabase.
- Priorizar alterações visuais incrementais em CSS e HTML.
- Manter responsividade, acessibilidade por teclado e preferência por movimento reduzido.
- Não alterar regras de jogo nem dados persistidos nesta subetapa.

## 5.1 — Polimento visual
**Status: em implementação; aguardando teste e aprovação do usuário.**

Escopo:
- Refinar paleta, contraste, profundidade, bordas e hierarquia visual.
- Melhorar a apresentação de cabeçalho, cartões, HUD, diário, diálogos e inventário.
- Adicionar estados consistentes de hover, foco visível e interação.
- Ajustar detalhes responsivos para telas menores.
- Respeitar a preferência do sistema por movimento reduzido.

Critérios de aceitação:
- [ ] A página e o jogo carregam sem erros.
- [ ] Login, seleção de personagem e logout continuam funcionando.
- [ ] HUD, diário, diálogos e inventário continuam legíveis e utilizáveis.
- [ ] Os controles por teclado e os formulários continuam funcionando.
- [ ] O layout permanece utilizável em desktop e celular.
- [ ] Não há regressão em multiplayer, combate, missões, itens ou transições de região.

## Próximas subetapas — não iniciadas
### 5.2 — Performance e estabilidade
Otimização e testes de FPS, renderização, sincronização e transições.

### 5.3 — Experiência do jogador
Feedback de ações, indicadores, controles, menus e mensagens.

### 5.4 — Revisão e deploy
Testes finais de produção, integração Supabase, permissões e acesso em diferentes computadores.

## Regra de avanço
Cada subetapa será implementada, publicada para teste, validada pelo usuário e só então marcada como aprovada. Não iniciar a próxima subetapa antes dessa aprovação.
