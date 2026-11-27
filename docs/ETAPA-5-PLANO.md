# Etapa 5 — Polimento visual, performance e deploy

## Status geral
**Planejamento aprovado pelo usuário em 2026-11-27.** As subetapas 5.1, 5.2 e 5.3 foram implementadas, publicadas e aprovadas pelo usuário. A subetapa 5.4 — Revisão e deploy — está em andamento.

## Objetivo
Refinar a apresentação e a experiência de Aetheria Online, preservar as funções aprovadas e revisar a publicação, integração Supabase, permissões e acesso.

## Decisões técnicas
- Manter Phaser 3.80.1, JavaScript clássico e hospedagem estática.
- Preservar as APIs e integrações atuais com Supabase.
- Não alterar regras de jogo nem dados persistidos sem necessidade e validação.
- Manter responsividade e acessibilidade por teclado.

## 5.1 — Polimento visual
**Status: aprovada pelo usuário em 2026-11-27.**

Implementado e publicado:
- Refinamento da paleta, contraste, profundidade, bordas e hierarquia visual.
- Melhorias no cabeçalho, cartões, HUD, diário de missões, diálogos e inventário.
- Estados de interação mais perceptíveis e ajustes responsivos.

## 5.2 — Performance e estabilidade
**Status: aprovada pelo usuário em 2026-11-27.**

Implementado:
- IA dos monstros executada em intervalos de 100 ms.
- Barras de vida e nomes acompanham os sprites em todos os frames; a barra só é redesenhada quando o HP muda.
- Listeners globais de foco removidos no encerramento da cena.
- Broadcast (100 ms em movimento) e persistência de posição (1.000 ms fora da arena e 300 ms na arena) revisados e mantidos.

Critérios testados e aprovados: inicialização, troca de região, IA, barras de vida, movimento, combate, multiplayer e salvamento.

## 5.3 — Experiência do jogador
**Status: aprovada pelo usuário em 2026-11-27.**

Implementado e publicado:
- Legenda de controles com teclas destacadas e layout responsivo.
- Mensagens temporárias de feedback sem apagar a legenda de controles.
- Estado de conexão e contagem de jogadores com anúncios acessíveis.
- Atributos de acessibilidade para regiões de status e botão da bolsa.
- Identificação da versão 5.3 no cabeçalho.

O usuário testou e aprovou a subetapa.

## 5.4 — Revisão e deploy
**Status: em andamento.**

### Verificações concluídas em 2026-11-27
- Vercel: projeto localizado; deployment de produção mais recente em estado `READY`, ligado à branch `main` e ao commit `ad179ba99a693a250376debb936db45deee6b30d`.
- Domínio principal `https://tibia-browser-mmorpg.vercel.app` e aliases de produção associados ao deployment.
- Proteção por senha, SSO e lista de IPs confiáveis desativadas no projeto, permitindo acesso público.
- Supabase: projeto `ACTIVE_HEALTHY`, PostgreSQL 17.12.
- Nove migrações registradas no banco.
- Três Edge Functions ativas: `arena-attack`, `quest-action` e `inventory-action`, todas com verificação JWT habilitada.
- RLS habilitada nas tabelas revisadas. Tabelas de inventário, missões e cooldowns não concedem acesso direto a `anon` ou `authenticated`; o acesso é feito pelas funções de servidor com `service_role`.
- As políticas de `characters` restringem leitura, criação e atualização à conta proprietária.
- Advisors de desempenho e saúde sem apontamentos; consulta agregada de erros de runtime da Vercel sem erros nas últimas 24 horas.

### Pontos de atenção identificados
- O advisor do Supabase informa que a proteção contra senhas comprometidas está desativada. É uma melhoria recomendada para a configuração de Auth.
- A tabela `characters` ainda concede ao papel `authenticated` atualização direta de `level`, `hp`, `max_hp` e `xp`. O cliente atualmente persiste esses campos diretamente em `src/backend.js`; portanto, um usuário pode alterar a progressão do próprio personagem fora do fluxo normal do jogo. O isolamento entre contas continua aplicado por RLS, mas a integridade antitrapaça desses campos não está garantida.
- A posição/mapa também são enviados pelo cliente, limitação já conhecida do protótipo. A validação de PvP e das ações de missão reduz alguns abusos, mas não substitui uma simulação autoritativa no servidor.
- As tabelas de inventário/missões sem políticas RLS próprias são intencionais no desenho atual: não há privilégios diretos para usuários autenticados, e as operações passam pelas Edge Functions.

### Próximos passos
- Decidir e implementar uma migração da gravação de progressão para validação no servidor antes de declarar a integridade da progressão protegida.
- Avaliar a ativação da proteção contra senhas comprometidas no Supabase Auth.
- Fazer um teste final do domínio público em outro computador/rede, incluindo login, seleção de personagem, troca de região, inventário e persistência.
- Revalidar o deployment de produção e então submeter a 5.4 à aprovação do usuário.

## Regra de avanço
Cada subetapa será implementada, publicada para teste, validada pelo usuário e só então marcada como aprovada. Não declarar a Etapa 5 concluída enquanto os pontos de atenção da revisão final não estiverem resolvidos ou explicitamente aceitos como limitações do protótipo.
