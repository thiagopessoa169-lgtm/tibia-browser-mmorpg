# Etapa 5 — Polimento visual, performance e deploy

## Status geral
**Planejamento aprovado pelo usuário em 2026-11-27.** A subetapa 5.1 foi implementada, publicada e aprovada pelo usuário em 2026-11-27. A subetapa 5.1 foi aprovada; a 5.2 foi aprovada pelo usuário em 2026-11-27; a 5.3 está em andamento.

## Objetivo
Refinar a apresentação e a experiência de Aetheria Online sem alterar regras de combate, progressão, inventário, missões, autenticação ou persistência já aprovadas.

## Decisões técnicas
- Manter Phaser 3.80.1, JavaScript clássico e hospedagem estática.
- Preservar as APIs e integrações atuais com Supabase.
- Priorizar alterações visuais incrementais em CSS e HTML.
- Manter responsividade, acessibilidade por teclado e preferência por movimento reduzido.
- Não alterar regras de jogo nem dados persistidos nesta subetapa.

## 5.1 — Polimento visual
**Status: aprovada pelo usuário em 2026-11-27.**

Implementado e publicado:
- Refinamento da paleta, contraste, profundidade, bordas e hierarquia visual.
- Melhorias visuais no cabeçalho, cartões, HUD, diário de missões, diálogos e inventário.
- Estados de interação e destaque visual mais perceptíveis.
- Ajustes responsivos para telas menores.
- Identificação visual da versão de polimento 5.1 no cabeçalho.

## 5.2 — Performance e estabilidade
**Status: aprovada pelo usuário em 2026-11-27.**

Escopo desta subetapa:
- Reduzir trabalho repetitivo por frame na IA dos monstros e na atualização das barras de vida.
- Revisar o envio de posição e a interpolação de jogadores remotos sem alterar a frequência/garantias de persistência já existentes.
- Verificar inicialização, transições de região, retorno de foco e limpeza de objetos/canais.
- Testar em navegador desktop e tela menor, observando travamentos, erros no console e comportamento multiplayer.
- Preservar combate, movimento, missões, inventário, progresso e regras de PvP.

**Otimizações e correções aplicadas:** IA dos monstros executada em intervalos de 100 ms; barras e nomes acompanham os sprites em todos os frames, redesenhando a barra somente quando o HP muda; listeners globais de foco do teclado são removidos no encerramento da cena para evitar acúmulo após trocar de região. A frequência de broadcast (100 ms quando há movimento) e a persistência de posição (1.000 ms fora da arena e 300 ms na arena) foram revisadas e mantidas sem alterações.

**Critérios de aceitação:** jogo inicia e troca de região sem erros; monstros continuam patrulhando, perseguindo e atacando; barras de vida continuam corretas após receber dano; movimento e combate do jogador permanecem responsivos; multiplayer e salvamento continuam funcionando.

### 5.3 — Experiência do jogador
**Status: em andamento.**

Implementado para teste:
- Legenda de controles com teclas destacadas, incluindo movimento, corrida, ataque, interação, bolsa e fechamento de janelas.
- Legenda responsiva para telas menores.
- Mensagens de feedback anunciadas por região acessível (`aria-live`) sem apagar a legenda de controles.
- Estado de conexão e contagem de jogadores com anúncios acessíveis.
- Identificação da versão 5.3 no cabeçalho.

Escopo restante: testar a leitura visual da legenda em desktop e celular, mensagens de ações, diálogos, bolsa e fluxo de autenticação; corrigir qualquer regressão relatada pelo usuário.

### 5.4 — Revisão e deploy
**Status: não iniciada.**
Testes finais de produção, integração Supabase, permissões e acesso em diferentes computadores.

## Regra de avanço
Cada subetapa será implementada, publicada para teste, validada pelo usuário e só então marcada como aprovada. Não iniciar a próxima subetapa antes dessa aprovação.
