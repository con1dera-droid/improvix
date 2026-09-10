# Matriz RBAC — ImprovisaLab

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
