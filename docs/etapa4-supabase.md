# Etapa 4 — configurar login (Supabase gratuito)

O IMPROVIX continua sendo um site estático (sem servidor próprio), mas a
partir da Etapa 4 ele pode, opcionalmente, se conectar a um projeto
[Supabase](https://supabase.com) gratuito para guardar contas de usuário,
histórico de análises, favoritos e "Meus Exercícios".

**Isso é opcional e sem custo.** Sem configurar nada, o site continua
funcionando 100% como nas Etapas 1–3 — só o botão "Entrar" mostra um aviso
dizendo que o login ainda não foi configurado. Este é o único passo manual
que só você (usuário) pode fazer, porque exige criar uma conta em outro
serviço — eu não posso criar isso por você.

## Passo 1 — Criar o projeto Supabase (grátis)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
   (dá para entrar com GitHub ou e-mail).
2. Clique em **New project**.
3. Escolha um nome (ex.: `improvix`), uma senha para o banco (guarde-a,
   mas ela não é usada no site) e a região mais próxima de você.
4. Aguarde alguns minutos até o projeto ficar pronto.

O plano gratuito do Supabase inclui banco Postgres, autenticação e
Row Level Security sem custo, com um limite generoso de uso mensal. **Único
cuidado**: um projeto gratuito que fica muito tempo sem uso pode ser pausado
automaticamente pelo Supabase; se isso acontecer, basta reativá-lo no painel
(seus dados não são apagados).

## Passo 2 — Criar as tabelas (rodar o schema.sql)

1. No painel do seu projeto, abra **SQL Editor** (menu lateral).
2. Clique em **New query**.
3. Abra o arquivo `sql/schema.sql` deste projeto, copie todo o conteúdo e
   cole no editor.
4. Clique em **Run**.

Isso cria as tabelas `profiles`, `analises`, `favoritos` e `exercicios`, já
com Row Level Security (RLS) ativada e as políticas que garantem que cada
pessoa só enxerga os próprios dados — essa é a proteção real, aplicada pelo
banco, não pelo site.

## Passo 3 — Copiar a URL e a chave anônima

1. No painel, vá em **Project Settings → API**.
2. Copie o **Project URL** (algo como `https://xxxxxxxx.supabase.co`).
3. Copie a chave **anon public** (a chave pública/anônima — não é a
   `service_role`, que nunca deve ir para o site).
4. Abra `js/config.js` neste projeto e substitua os valores de exemplo:

```js
window.IL_CONFIG = {
  supabaseUrl: 'https://xxxxxxxx.supabase.co',
  supabaseAnonKey: 'coloque-aqui-a-chave-anon-public'
};
```

5. Salve o arquivo e recarregue o site (`index.html`).

A chave `anon` é feita para ser pública (fica visível no navegador de
qualquer visitante) — por isso pode ficar direto no código, sem segredo.
Quem protege os dados de cada usuário é a RLS do Passo 2, não o sigilo dessa
chave.

## Passo 4 — Testar

1. Clique em **Entrar** no site e depois em **Criar conta**. Cadastre-se com
   um e-mail e senha de teste.
2. Faça uma análise (Visão Geral) e clique em **💾 Salvar** para guardar no
   histórico.
3. Abra a aba Fraseados, escolha uma frase e clique em **☆ Favoritar** ou
   **+ Exercício**.
4. Confira em **Histórico**, **Favoritos** e **Meus Exercícios** no menu
   lateral se os itens aparecem.
5. Em **Configurações**, clique em **Sair da conta** e confirme que os
   botões de salvar voltam a ficar desabilitados.

Por padrão, o Supabase pede confirmação por e-mail antes do primeiro login
funcionar. Se depois de criar a conta aparecer a mensagem "Confirme seu
e-mail", verifique a caixa de entrada do e-mail usado (e o spam). Se quiser
pular essa confirmação enquanto testa sozinho, dá para desativar em
**Authentication → Providers → Email → Confirm email** no painel do
Supabase (recomendo reativar antes de convidar outras pessoas a usar).

## Passo 5 (recomendado) — Checklist manual de isolamento entre contas

Um ambiente automatizado não consegue testar isso por você porque exige um
projeto Supabase real, mas é importante confirmar manualmente ao menos uma
vez:

1. Crie **duas** contas de teste diferentes (ex.: `teste1@...` e
   `teste2@...`).
2. Com a conta 1, salve uma análise, um favorito e um exercício.
3. Saia e entre com a conta 2.
4. Confirme que **Histórico**, **Favoritos** e **Meus Exercícios** aparecem
   **vazios** para a conta 2 (ela não deve ver nada da conta 1).
5. Salve algo com a conta 2 e confirme que a conta 1 também não vê os dados
   da conta 2 ao entrar de novo.

Se algum dado "vazar" entre contas, revise se o `sql/schema.sql` foi
executado por completo (as políticas de RLS ficam no final do arquivo) —
isso é o item mais importante de segurança desta etapa.

## Passo 6 — Virar administrador da plataforma

A partir de 13/10/2026 isso ficou **automático**: o **primeiro cadastro do
sistema é o administrador**, carimbado pelo próprio banco (trigger
`handle_new_user`). Não precisa de `update` nenhum no SQL Editor.

1. Com a configuração pronta, abra o site e crie **a sua** conta antes de
   divulgar o endereço para alguém: o primeiro e-mail que se cadastrar é o
   que ganha a coroa. Ele entra direto, já liberado.
2. Do segundo em diante, cada cadastro nasce **esperando liberação** (é a
   pessoa que vê isso escrito na tela) até você liberar.
3. No menu aparece **👑 Administração**, com duas abas:

**Aba Contas** — para cada pessoa (menos você):

* **✓ Liberar acesso / ↓ Suspender liberação** — é o que deixa a pessoa
  entrar.
* **👑 Tornar admin / ↓ Tirar admin** — dá ou tira o acesso a essa tela.
* **🖥 Telas** — escolhe quais telas aquela pessoa vê. Início e
  Configurações nunca somem, senão a pessoa ficaria dentro do sistema sem
  lugar nenhum para ir.
* **🔑 Senha nova** — manda para ela o e-mail de recuperação do Supabase. A
  senha quem escolhe é ela, no link; você não vê nem escolhe senha de
  ninguém.
* **⛔ Bloquear / ✓ Desbloquear** — corta o acesso da conta. Ao bloquear,
  você pode registrar um motivo, que fica guardado e aparece para a pessoa.

**Aba Sistema** — a configuração geral:

* **Quem pode entrar**: *Com aprovação* (padrão — a pessoa se cadastra e
  fica esperando você liberar na aba Contas), *Entra direto* (está dentro
  sem esperar por você) ou *Fechado* (não aparece botão de criar conta — só
  entra quem você convidar). Em qualquer um deles, você continua podendo
  suspender a liberação, bloquear ou excluir uma conta depois, na aba
  Contas. As três fichas são cartões, com a explicação embaixo do nome, e a
  escolhida acende na hora do clique.

  **Confirmar o e-mail é outra chave, e ela não fica aqui**: está no painel
  do Supabase, em *Authentication > Sign In / Providers > Email > Confirm
  email*. Ligada (o padrão), ninguém entra sem clicar no link que chega por
  e-mail; desligada, a conta vale na hora do cadastro e **nenhum e-mail é
  enviado**. Por isso o texto desta tela não fala em confirmação: ele
  descreve só o que acontece **depois** dela, seja ela qual for.

  **O que se perde desligando a confirmação**: ninguém prova que o e-mail é
  seu. Quem errar uma letra no endereço fica sem o "Esqueci minha senha" (o
  link vai para o endereço errado), e dá para se cadastrar com o e-mail de
  outra pessoa. Desligada a confirmação, o modo *Com aprovação* passa a ser
  a única porta de verdade — vale manter, a não ser que você aceite que
  qualquer um com o endereço do site entre sozinho.
* **Recado na tela de entrada**: aparece para todo mundo antes de entrar
  (ex.: "Aula na quinta, 19h. Quem ainda não tem acesso, me chame no
  WhatsApp").
* **Telas liberadas para todo mundo**: o padrão dos usuários comuns. Você,
  como admin, continua vendo tudo.
* **Convidar pelo e-mail**: quem se cadastrar com um e-mail convidado entra
  **já liberado**, sem esperar. O convite guarda só o e-mail — a senha é a
  própria pessoa que cria.

**O que o bloqueio faz, na prática**: os dados da pessoa ficam inacessíveis
na hora — não é a tela que esconde, é o banco que recusa, então nem
chamando a API direto ela consegue ler ou gravar qualquer coisa. E, se ela
estiver com o site aberto, é desconectada assim que abrir ou voltar para a
aba, com o aviso do motivo.

**A sua própria conta não tem botões** na lista. É proposital: evita o
clássico "me tirei de admin sem querer e agora ninguém administra nada". Se
precisar mesmo mudar, dá para rodar no SQL Editor:

```sql
update public.profiles set papel = 'admin', aprovado = true where email = 'voce@exemplo.com';
```

**Um detalhe de privacidade**: o admin vê a lista de contas (e-mail, papel,
situação) — e **não** vê o histórico, os favoritos nem os exercícios de
ninguém. Isso não é escolha da tela: não existe regra no banco que dê esse
acesso.

## Passo 7 — Os e-mails com a cara do IMPROVIX

Quem manda o e-mail de confirmação de cadastro é o Supabase, com um modelo que
fica no painel dele — por isso o texto não está no código do site. Os modelos
prontos (confirmação, senha nova e convite), com a marca e em português, estão
na pasta `email/`, e o passo a passo de onde colar cada um está em
**`docs/emails-supabase.md`**.

**Mas há uma trava, desde 3/6/2026**: nos projetos novos do plano gratuito que
usam o e-mail embutido, o Supabase não deixa mais editar os modelos — os campos
Subject e Body ficam travados, com o aviso *"Set up custom SMTP to edit
templates"*. Ligar um **SMTP próprio** destrava os dois campos (e de quebra faz
o remetente dizer "IMPROVIX" em vez de "Supabase Auth"). Sem isso, o e-mail sai
no padrão em inglês, que funciona — ou você desliga a confirmação de e-mail,
como explicado no Passo 6. Os detalhes e as alternativas estão em
`docs/emails-supabase.md`.

## Passo 8 — O endereço público (Site URL)

Se o site está publicado (ex.: `https://improvix.vercel.app`), avise o
Supabase: **Authentication > URL Configuration**, campo **Site URL**. É o
endereço para onde o link do e-mail de confirmação e o de senha nova levam
a pessoa de volta. Com o campo errado, os e-mails mandam para
`localhost:3000` e a pessoa trava.

## Atualizando um projeto que já existia

O `sql/schema.sql` é **idempotente**: dá para rodar de novo no SQL Editor
sem perder nada (e é preciso rodar de novo a cada novidade do banco — a
última foi o **último acesso** de cada conta, em 14/10/2026: sem rodar, a
coluna aparece vazia na Administração) — ele cria o que falta (`aprovado`, `modulos`,
`config_sistema`, `convites`, a função `pode_usar`) e atualiza as políticas.

Um detalhe importante nessa atualização: as contas que **já existiam**
continuam liberadas (`aprovado` entra como `true` para quem já estava lá), e
só os cadastros **novos** passam a nascer esperando. Se você quer rever
quem tem acesso, a aba Contas tem o botão de suspender a liberação de cada
um.

## O que continua funcionando sem essa configuração

Sem Supabase configurado (os valores de exemplo em `js/config.js`), o site
fica **aberto, como nas Etapas 1–3**: análise harmônica, fraseados,
tablatura, partitura, cifra, escalas, acordes e áudio funcionam
normalmente, e o portão de entrada nem sobe — só os recursos que dependem
de conta (histórico, favoritos, exercícios salvos e administração) ficam
indisponíveis.

É assim de propósito: quem baixa o projeto consegue usar tudo sem criar
conta em serviço nenhum. O login só existe quando você configura o
Supabase — e, aí, ele passa a valer para todo mundo.
