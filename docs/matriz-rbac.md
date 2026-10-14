# Matriz RBAC — IMPROVIX

Não é um sistema multi-tenant (não atende empresas/clientes separados); é
B2C — cada usuário é dono só dos próprios dados (histórico, favoritos,
exercícios). O isolamento é por `user_id`, com RLS a partir da Etapa 4.

## Etapa 1 (sem login)

Só existe o papel **Visitante** (qualquer pessoa que abre o site). Não há
dado sensível nem gravação — todas as permissões são públicas.

| Ação | Visitante |
|---|---|
| Digitar tonalidade/progressão e ver análise harmônica | ✅ |
| Ver escalas/arpejos/notas-alvo recomendados | ✅ |
| Salvar histórico | ❌ (recurso não existe ainda) |
| Favoritar | ❌ (recurso não existe ainda) |

## A partir da Etapa 4 (login) — papéis previstos

| Ação | Visitante | Usuário Gratuito | Usuário Pro | Admin |
|---|---|---|---|---|
| Usar análise harmônica (Visão Geral/Escalas/Arpejos/Notas-alvo) | ✅ | ✅ | ✅ | ✅ |
| Ver fraseados básicos (fácil/intermediário) | ✅ | ✅ | ✅ | ✅ |
| Ver fraseados avançados | ❌ | ❌ | ✅ | ✅ |
| Ouvir áudio da progressão/fraseados | ✅ | ✅ | ✅ | ✅ |
| Salvar histórico de análises | ❌ | ✅ | ✅ | ✅ |
| Favoritar fraseados/análises | ❌ | ✅ | ✅ | ✅ |
| Ver/editar os próprios dados em "Meus Exercícios" | ❌ | ✅ | ✅ | ✅ |
| Acessar "Laboratório" (recursos experimentais) | ❌ | ❌ | ✅ | ✅ |
| Ver dados de histórico/favoritos de outro usuário | ❌ | ❌ | ❌ | ❌ |
| Gerenciar catálogo de fraseados/escalas (conteúdo do sistema) | ❌ | ❌ | ❌ | ✅ |
| Gerenciar planos e assinaturas de usuários | ❌ | ❌ | ❌ | ✅ |
| Ver fila de erros reportados | ❌ | ❌ | ❌ | ✅ |

Regra fixa: mesmo um Admin autenticado nunca lê `analises`, `favoritos` ou
`exercicios_salvos` de outro `user_id` pela tabela de dados do usuário — isso
é aplicado no banco (RLS), não só escondido na interface. Uma eventual tela
de suporte para Admin usa uma rota/serviço separado com log de acesso, não a
mesma política de RLS do usuário comum.

## Implementado (2026-09-15) — papéis, bloqueio e a tela de Administração

O que antes era "papéis previstos" agora existe no banco e na tela. O papel
mora em `profiles.papel` (`usuario` | `admin`) e o bloqueio em
`profiles.bloqueado`, com `bloqueado_em`, `bloqueado_por` e
`motivo_bloqueio` carimbados **pelo próprio banco**.

| Ação | Visitante | Usuário | Pro | Admin | Bloqueado |
|---|---|---|---|---|---|
| Estudar (análise, escalas, fraseados, padrões, transcrição, áudio) | ✅ | ✅ | ✅ | ✅ | ✅¹ |
| Nível Avançado dos fraseados e Laboratório | ❌ | ❌ | ✅ | ✅ | ❌ |
| Salvar histórico / favoritos / exercícios | ❌ | ✅ | ✅ | ✅ | ❌ |
| Ler os próprios dados salvos | ❌ | ✅ | ✅ | ✅ | ❌ |
| Ler dados salvos de outra pessoa | ❌ | ❌ | ❌ | ❌ | ❌ |
| Listar todas as contas | ❌ | ❌ | ❌ | ✅ | ❌ |
| Mudar plano de outra pessoa | ❌ | ❌ | ❌ | ✅ | ❌ |
| Promover/rebaixar admin | ❌ | ❌ | ❌ | ✅ | ❌ |
| Bloquear/desbloquear outra pessoa | ❌ | ❌ | ❌ | ✅ | ❌ |
| Mudar o próprio plano/papel/bloqueio | ❌ | ❌ | ❌ | ❌² | ❌ |

¹ O bloqueio corta a **conta**, não o estudo: o conteúdo do site é público e
continua aberto para qualquer um, logado ou não. O que o bloqueado perde é
tudo que depende de conta.

² Nem o admin muda o próprio papel ou se bloqueia — é o que garante que
sempre sobre pelo menos um administrador com acesso. Para trocar o próprio
papel, só pelo SQL Editor do Supabase.

**O primeiro admin** nasce de um `update` rodado no SQL Editor (o passo a
passo está no fim de `sql/schema.sql`). Não existe "virar admin" pelo site:
o trigger `protege_campos_privilegiados` recusa qualquer mudança de papel
vinda da API. Daí em diante o admin cria os outros pela tela.

**Onde isso é aplicado**: no banco. As políticas de RLS negam leitura e
escrita de quem está bloqueado, e o trigger reverte qualquer tentativa de
mexer em campo privilegiado vinda do papel `authenticated` (que é como o
site e qualquer chamada de API com a chave anônima aparecem para o
Postgres). A tela só esconde o que não adianta mostrar.

**Conferido, não presumido**: `tests/rls.sql` sobe um PostgreSQL de
verdade, aplica o `sql/schema.sql` e ataca o banco como cada tipo de
usuário — 23 checagens, incluindo "usuário comum tenta se promover a admin
pela API" e "bloqueado tenta ler os próprios dados". Rode com
`bash tests/rls.sh`. O teste de tela (`tests/admin.smoke.js`) usa um
Supabase falso que reproduz exatamente essas mesmas regras, para a interface
nunca prometer o que o banco recusa.

**Uma decisão de privacidade**: o admin **não** enxerga o histórico, os
favoritos nem os exercícios de ninguém — só a lista de contas (e-mail,
plano, papel, situação). Isso é regra de banco, não de tela: não existe
política de RLS que dê a um admin acesso aos dados de estudo dos outros.

## Implementado (2026-10-13) — sistema fechado: ninguém entra sem liberação

O dono do projeto pediu que o acesso deixasse de ser livre: **login
obrigatório**, com um administrador controlando tudo. Duas mudanças grandes
na matriz acima:

1. **os planos acabaram.** Não existe mais Gratuito/Pro — quem entra tem
   tudo, inclusive o nível Avançado dos fraseados. O que limita agora é a
   liberação da conta e as **telas** que o administrador deixa abertas;
2. **não existe mais Visitante.** Quem não tem conta liberada não vê o site:
   vê a tela de entrada e nada mais.

Campos novos em `profiles`: `aprovado` (nasce `false`, salvo nas exceções
abaixo) e `modulos` (jsonb — as telas daquela pessoa; `null` = as do
sistema). Tabelas novas: `config_sistema` (uma linha só: modo de cadastro,
recado da tela de entrada, telas do sistema) e `convites` (e-mail, usado).

| Ação | Sem conta | Esperando liberação | Liberado | Admin | Bloqueado |
|---|---|---|---|---|---|
| Ver o site (menu, telas, áudio) | ❌ | ❌ | ✅ | ✅ | ❌ |
| Ler o recado da tela de entrada | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar conta | ✅¹ | — | — | — | ❌ |
| Salvar/ler histórico, favoritos, exercícios | ❌ | ❌ | ✅ | ✅ | ❌ |
| Ler dados salvos de outra pessoa | ❌ | ❌ | ❌ | ❌ | ❌ |
| Listar todas as contas | ❌ | ❌ | ❌ | ✅ | ❌ |
| Liberar/suspender liberação de alguém | ❌ | ❌ | ❌ | ✅ | ❌ |
| Promover/rebaixar admin · bloquear/desbloquear | ❌ | ❌ | ❌ | ✅ | ❌ |
| Escolher as telas de alguém | ❌ | ❌ | ❌ | ✅ | ❌ |
| Mudar a configuração do sistema | ❌ | ❌ | ❌ | ✅ | ❌ |
| Convidar por e-mail / ver convites | ❌ | ❌ | ❌ | ✅ | ❌ |
| Mandar e-mail de senha nova para alguém | ❌ | ❌ | ❌ | ✅² | ❌ |
| Mudar o próprio papel/liberação/bloqueio/telas | ❌ | ❌ | ❌ | ❌ | ❌ |

¹ Depende do modo em `config_sistema.cadastro`: **aprovacao** (padrão — cria
e espera), **livre** (cria e entra) ou **fechado** (não aparece botão de
criar conta; só entra quem foi convidado pelo e-mail).

² "Senha nova" é o e-mail de recuperação do próprio Supabase
(`resetPasswordForEmail`): o administrador dispara, e **a pessoa** escolhe a
senha no link. Administrador nenhum vê, escolhe ou descobre a senha de
ninguém — e nenhuma chave `service_role` entra no site para isso.

**Quem é o primeiro admin**: o **primeiro cadastro** do sistema, carimbado
pelo trigger `handle_new_user` (`papel='admin'`, `aprovado=true`). Não
precisa mais de `update` no SQL Editor. Os seguintes nascem esperando
liberação, e é o admin que decide.

**Onde isso é aplicado**: no banco, de novo. Toda política de RLS das
tabelas de dados passou a exigir `public.pode_usar()` — uma função
`security definer` que responde "essa pessoa foi aprovada e não está
bloqueada?". `config_sistema` é lida por qualquer um (inclusive sem sessão,
porque a tela de entrada mostra o recado) e escrita só por admin;
`convites` só existe para admin. O trigger
`protege_campos_privilegiados` passou a reverter também `aprovado` e
`modulos`, então ninguém se libera nem se dá telas pela API.

**Conferido, não presumido**: `tests/rls.sql` subiu de 23 para **40
checagens** num PostgreSQL de verdade — entre elas "o primeiro cadastro vira
admin", "quem está esperando não lê nem grava nada", "ninguém se aprova",
"só admin muda a configuração", "qualquer um lê a configuração, até sem
sessão" e "usuário comum não vê a lista de convites". Na tela,
`tests/acesso.smoke.js` (24 checagens) e `tests/admin.smoke.js` (19) usam o
mesmo Supabase falso, que reproduz essas regras.

**Até onde isso protege**: os **dados** ficam protegidos pelo banco, mesmo
contra quem chame a API por fora do site. Os **arquivos** do site (HTML,
CSS, JS) continuam públicos — é um site estático; o login fecha o uso
prático e os dados, não o download do código.

## Último acesso (2026-10-14)

Campo novo: `profiles.ultimo_acesso`. Quem escreve nele é **só** a função
`public.registrar_acesso()` (`security definer`), que usa o relógio do banco e
a sessão de quem chamou — não aceita data nem id como parâmetro. O trigger
`protege_campos_privilegiados` reverte qualquer escrita direta na coluna,
inclusive a do administrador.

| Ação | Sem conta | Esperando | Liberado | Admin |
|---|---|---|---|---|
| Registrar o próprio acesso (`registrar_acesso()`) | ❌ | ❌¹ | ✅ | ✅ |
| Ver o próprio último acesso | ❌ | ❌ | ✅ | ✅ |
| Ver o último acesso de todas as contas | ❌ | ❌ | ❌ | ✅ |
| Escrever a data direto na coluna | ❌ | ❌ | ❌ | ❌² |

¹ A função existe para qualquer sessão autenticada, mas o site só a chama
para quem passou no `pode_usar()` — quem está esperando liberação não usou
nada ainda.

² Nem o admin: a coluna é revertida pelo trigger. Conferido em
`tests/rls.sql` ("ninguém inventa a própria data de acesso", "nem o admin
reescreve o acesso de outra pessoa").
