# Os e-mails do IMPROVIX (modelos do Supabase)

Quem manda o e-mail de confirmação de cadastro **não é o site**: é o Supabase.
Por isso o texto dele não mora no código — mora no painel do Supabase, num
modelo que dá para trocar. Esta pasta tem os modelos prontos, com a cara do
IMPROVIX, e aqui está onde colar cada um.

Arquivos:

| Arquivo | Onde colar no painel | Quando a pessoa recebe |
|---|---|---|
| `email/confirmacao.html` | Authentication > Emails > Templates > **Confirm signup** | Acabou de criar a conta |
| `email/senha-nova.html` | Authentication > Emails > Templates > **Reset password** | Pediu "Esqueci minha senha", ou o admin clicou em 🔑 Senha nova |
| `email/convite.html` | Authentication > Emails > Templates > **Invite user** | Só se o convite for disparado pelo painel do Supabase |

## ⚠️ Antes de tentar colar: o plano gratuito travou isso (junho/2026)

Em **3 de junho de 2026** o Supabase passou a **bloquear a edição dos modelos
nos projetos novos do plano gratuito** que usam o serviço de e-mail embutido.
Na tela de Templates aparece o aviso *"Set up custom SMTP to edit templates"* e
os campos **Subject** e **Body** ficam travados — não adianta colar. Projetos
criados antes dessa data continuam podendo editar; o do IMPROVIX é mais novo e
pegou a regra nova.

Ou seja: **ligar um SMTP próprio deixou de ser opcional**. Era só para o
remetente dizer "IMPROVIX"; agora é a única forma de mudar qualquer coisa no
e-mail. Com o SMTP ligado, os campos destravam e o passo a passo abaixo volta a
valer, tal e qual.

Enquanto isso há dois caminhos, e nenhum deles é "o site está quebrado":

1. **Deixar o e-mail padrão em inglês.** A pessoa recebe *"Confirm your email
   address"*, clica e entra. Feio, não defeituoso.
2. **Desligar a confirmação de e-mail** em *Authentication > Sign In /
   Providers > Email > Confirm email*. Aí nenhum e-mail é enviado no cadastro
   e a conta vale na hora — com o custo de ninguém provar que o endereço é
   seu (ver `docs/etapa4-supabase.md`, Passo 6).

Fonte: <https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier>

## O passo a passo (depois que o SMTP estiver ligado)

1. Entre em **supabase.com**, abra o projeto.
2. No menu da esquerda: **Authentication** → **Emails** → aba **Templates**.
3. Escolha **Confirm signup**.
4. No campo **Subject heading** (o título que aparece na caixa de entrada), escreva:

   ```
   🎵 IMPROVIX — parabéns, seja bem-vindo! Confirme seu e-mail
   ```

5. Na caixa grande do **Message body**, apague tudo o que estiver lá e cole o
   conteúdo inteiro do arquivo `email/confirmacao.html`.
6. **Save**.
7. Repita para **Reset password** com o `email/senha-nova.html` e o título:

   ```
   🎵 IMPROVIX — sua senha nova
   ```

8. E, se quiser, para **Invite user** com o `email/convite.html` e o título:

   ```
   🎵 IMPROVIX — você foi convidado
   ```

Para conferir, crie uma conta de teste com outro e-mail seu: o e-mail chega
com o título novo e o corpo com a marca.

## `{{ .ConfirmationURL }}` — não mexa nisso

Dentro dos modelos existe `{{ .ConfirmationURL }}`. É o lugar onde o Supabase
encaixa o link de verdade na hora de enviar. Se esse nome for apagado ou
escrito diferente, o e-mail sai sem link e ninguém confirma nada. O resto do
texto pode ser mudado à vontade.

O link leva de volta para o endereço que está em **Authentication > URL
Configuration > Site URL** — hoje `https://improvix.vercel.app`. Se o endereço
do site mudar, mude ali também.

## O que NÃO dá para mudar no plano gratuito

O remetente continua aparecendo como **Supabase Auth
&lt;noreply@mail.app.supabase.io&gt;**. O título e o corpo são seus; o nome de
quem envia, não — ele vem do serviço de e-mail embutido do Supabase.

Para o remetente dizer "IMPROVIX", é preciso ligar um **SMTP próprio** em
*Authentication > Emails > SMTP Settings*. Serviços como Resend ou Brevo têm
plano gratuito suficiente para uma turma; lá você define o nome e o endereço
de quem envia (ex.: `IMPROVIX <contato@seudominio.com>`), e normalmente é
preciso ter um domínio próprio para confirmar que o endereço é seu. É meia
hora de configuração, e nada no código do site muda.

Vale saber também: **o serviço de e-mail embutido do Supabase é para testes** e
tem um limite baixo de envios por hora — dá para ver e ajustar em
*Authentication > Rate Limits*, no painel. Com SMTP próprio esse limite passa a
ser o do serviço que você escolher. Se um dia alguém disser que se cadastrou e
o e-mail não chegou, é o primeiro lugar para olhar.

## Por que os modelos são escritos com tabelas

Cliente de e-mail não é navegador: Gmail, Outlook e Apple Mail cortam folha de
estilo, flexbox e grid. Por isso os arquivos usam tabelas e estilo escrito em
cada elemento — é feio por dentro justamente para ficar certo por fora, em
qualquer caixa de entrada.
