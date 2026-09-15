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

Este é o único passo que **tem** de ser feito aqui no painel, e é de
propósito: se desse para virar admin pelo site, qualquer pessoa logada
faria isso pelo Console do navegador.

1. Crie a sua conta normalmente pelo site (botão **Entrar** > **Criar
   conta**), com o e-mail que você vai usar como administrador.
2. No Supabase, vá em **SQL Editor** e rode, trocando pelo seu e-mail:

   ```sql
   update public.profiles set papel = 'admin' where email = 'voce@exemplo.com';
   ```

3. Volte ao site e recarregue. Vai aparecer o item **👑 Administração** no
   menu lateral.

Na tela de Administração você vê todas as contas e, em cada uma:

* **↑ Tornar Pro / ↓ Voltar a Gratuito** — libera ou tira o nível Avançado
  dos fraseados e o Laboratório.
* **👑 Tornar admin / ↓ Tirar admin** — dá ou tira o acesso a essa própria
  tela.
* **⛔ Bloquear / ✓ Desbloquear** — corta o acesso da conta. Ao bloquear,
  você pode registrar um motivo, que fica guardado e aparece para a pessoa.

**O que o bloqueio faz, na prática**: os dados da pessoa ficam inacessíveis
na hora — não é a tela que esconde, é o banco que recusa, então nem
chamando a API direto ela consegue ler ou gravar qualquer coisa. E, se ela
estiver com o site aberto, é desconectada assim que abrir ou voltar para a
aba, com o aviso do motivo. O conteúdo de estudo do site continua aberto
(ele é público para qualquer visitante); o que ela perde é a conta.

**A sua própria conta não tem botões** na lista. É proposital: evita o
clássico "me tirei de admin sem querer e agora ninguém administra nada".
Se precisar mesmo mudar, rode o `update` do passo 2 no SQL Editor.

**Um detalhe de privacidade**: o admin vê a lista de contas (e-mail, plano,
papel, situação) — e **não** vê o histórico, os favoritos nem os exercícios
de ninguém. Isso não é escolha da tela: não existe regra no banco que dê
esse acesso.

## O que continua funcionando sem essa configuração

Análise harmônica, fraseados, tablatura, partitura, cifra e áudio (Etapas
1–3) funcionam normalmente mesmo sem Supabase configurado — apenas os
recursos que dependem de conta (histórico, favoritos, exercícios salvos,
planos e administração) ficam bloqueados até você seguir este guia.
