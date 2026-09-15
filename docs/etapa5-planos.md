# Etapa 5 — Planos (Gratuito / Pro)

O IMPROVIX agora distingue dois planos:

- **Gratuito** (padrão de todo mundo que cria conta): análise harmônica
  completa em todos os instrumentos, fraseados nível Iniciante e
  Intermediário, áudio, histórico, favoritos e Meus Exercícios.
- **Pro**: tudo do Gratuito, mais o nível **Avançado** nos fraseados (uma
  3ª escala recomendada por acorde e frases de "tensão" com escala
  alterada) — e, numa próxima etapa, o módulo Laboratório.

**Não existe cobrança configurada ainda.** Este documento é sobre como o
plano Pro funciona hoje (liberado manualmente) — não é um passo obrigatório
como o do Supabase (`docs/etapa4-supabase.md`); o site funciona
normalmente sem fazer nada aqui.

## Por que não tem botão de "assinar"

Colocar um botão de "Assinar Pro" que não processa pagamento nenhum seria
enganoso — pareceria uma cobrança real sem ser. Como ainda não escolhemos
(nem configuramos) um meio de pagamento, a tela de Configurações só mostra
o comparativo dos dois planos, sem nenhum botão de pagar. Quando um meio de
pagamento (Stripe, Mercado Pago etc.) for configurado numa etapa futura, aí
sim faz sentido ter um botão de verdade ali.

## Como funciona a trava hoje

- A tabela `profiles` (criada em `sql/schema.sql`) tem uma coluna `plano`
  (`gratuito` ou `pro`).
- Um trigger no banco (`prevent_plano_selfupgrade`) **impede que o próprio
  usuário mude seu `plano` pela API/app** — mesmo abrindo o Console do
  navegador e chamando `supabase.from('profiles').update(...)` diretamente,
  a mudança é revertida pelo banco. Só quem roda SQL direto no **SQL
  Editor** do Supabase (fora do fluxo do app) consegue promover alguém.
- No navegador, o nível "Avançado" aparece com 🔒 e um aviso para quem não
  é Pro; ao tentar selecioná-lo, a interface reverte sozinha para
  "Intermediário". **Importante ser honesto sobre o limite disso**: como o
  gerador de fraseados roda 100% no navegador (sem chamada a servidor), essa
  trava é de interface — alguém tecnicamente avançado poderia abrir o
  Console e chamar a função de gerar fraseados diretamente, pulando a tela.
  O que o banco realmente protege (com RLS + o trigger acima) são os dados
  que ficam salvos (histórico, favoritos, exercícios, e o próprio `plano`
  de cada um) — isso, sim, ninguém consegue burlar.

## Como promover alguém a Pro (por enquanto, manual)

1. Abra o projeto no [supabase.com](https://supabase.com) e vá em **SQL
   Editor**.
2. Rode (trocando o e-mail):

   ```sql
   update public.profiles set plano = 'pro' where email = 'alguem@exemplo.com';
   ```

3. Peça para a pessoa recarregar a página (ou sair e entrar de novo) — o
   plano é lido do banco a cada login/carregamento da página.

Para voltar ao gratuito:

```sql
update public.profiles set plano = 'gratuito' where email = 'alguem@exemplo.com';
```

## Testando manualmente

Como o trigger do banco só existe de verdade num projeto Supabase real (o
teste automatizado usa um cliente falso, que não tem RLS/trigger), vale
conferir uma vez à mão:

1. Crie uma conta de teste e confirme que o nível Avançado aparece com 🔒 e
   travado (não dá pra selecionar).
2. Promova essa conta a Pro pelo SQL acima e recarregue a página — o 🔒 some
   e o Avançado passa a funcionar (3 escalas por acorde, frase de tensão
   entre os fraseados).
3. Ainda logado como essa conta, abra o Console do navegador e tente:

   ```js
   window.IL.db.getSession().then(s => {
     const c = window.supabase.createClient(window.IL_CONFIG.supabaseUrl, window.IL_CONFIG.supabaseAnonKey);
     return c.from('profiles').update({ plano: 'pro' }).eq('id', s.data.session.user.id);
   });
   ```

   (ou qualquer tentativa parecida de forçar `plano` por conta própria) —
   confirme que o valor no banco não muda para quem já estava gratuito
   nem é afetado por uma tentativa de alguém gratuito se autopromover.

Se qualquer um desses passos não se comportar como descrito, revise
`sql/schema.sql` (a função `prevent_plano_selfupgrade` e o trigger
`trg_prevent_plano_selfupgrade` precisam estar rodados no seu projeto).
