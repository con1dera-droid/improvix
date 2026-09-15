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
