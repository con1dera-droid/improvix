-- IMPROVIX — banco de dados (contas, planos e administração)
-- Rode este script inteiro no SQL Editor do seu projeto Supabase
-- (Project > SQL Editor > New query > colar tudo > Run).
--
-- Pode rodar de novo quantas vezes quiser: tudo aqui é idempotente
-- (create ... if not exists / drop policy if exists antes de criar).
--
-- Cria 4 tabelas (profiles, analises, favoritos, exercicios), todas com
-- Row Level Security (RLS) ligado: cada usuário só enxerga e só grava as
-- próprias linhas. Isso é aplicado DENTRO do banco — mesmo que alguém
-- burle a interface e chame a API diretamente, o Postgres recusa.
--
-- Há dois papéis: 'usuario' e 'admin'. O admin enxerga todos os perfis e
-- pode mudar plano, papel e bloqueio dos outros — e nada disso depende da
-- interface: quem decide é o banco. Um usuário BLOQUEADO perde o acesso
-- aos próprios dados na hora, mesmo com a sessão aberta.

-- ============================================================
-- 1) profiles — um perfil por usuário (criado automaticamente no cadastro)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plano text not null default 'gratuito' check (plano in ('gratuito', 'pro')),
  criado_em timestamptz not null default now()
);

-- Administração: papel e bloqueio (colunas adicionadas depois, por isso o
-- "add column if not exists" — quem já tinha o banco da Etapa 4 roda este
-- script de novo e ganha as colunas sem perder nada).
alter table public.profiles add column if not exists papel text not null default 'usuario';
alter table public.profiles add column if not exists bloqueado boolean not null default false;
alter table public.profiles add column if not exists bloqueado_em timestamptz;
alter table public.profiles add column if not exists bloqueado_por uuid references auth.users(id);
alter table public.profiles add column if not exists motivo_bloqueio text;

-- Sistema fechado (13/10/2026): ninguém usa o IMPROVIX sem conta, e a conta
-- só vale depois de aprovada. `aprovado` entra como `true` para que quem já
-- tinha conta continue entrando; o padrão passa a ser `false` logo abaixo,
-- e quem decide o valor de cada cadastro novo é o trigger handle_new_user,
-- conforme o modo escolhido pelo admin em config_sistema.
alter table public.profiles add column if not exists aprovado boolean not null default true;
alter table public.profiles alter column aprovado set default false;
-- Telas liberadas só para esta pessoa (nulo = vale a configuração geral).
alter table public.profiles add column if not exists modulos jsonb;

-- Último acesso (14/10/2026): quando esta pessoa usou o site pela última vez.
-- Quem escreve aqui NÃO é o navegador: é a função registrar_acesso() abaixo,
-- que carimba o relógio do BANCO. Assim ninguém inventa uma data — a única
-- coisa que a pessoa controla é quando abre o site, que é justamente o que a
-- coluna quer dizer.
alter table public.profiles add column if not exists ultimo_acesso timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_papel_check') then
    alter table public.profiles add constraint profiles_papel_check check (papel in ('usuario', 'admin'));
  end if;
end $$;

alter table public.profiles enable row level security;

-- ------------------------------------------------------------
-- Funções de apoio das políticas.
--
-- As duas são SECURITY DEFINER de propósito: uma política de `profiles`
-- que consultasse `profiles` normalmente entraria em recursão infinita
-- (para ler a linha, o Postgres avaliaria a política, que leria a linha...).
-- Rodando como dona da função, a consulta ignora o RLS e o problema some.
-- Elas só devolvem true/false sobre o próprio chamador ou sobre um id
-- informado — não vazam dado nenhum.
-- ------------------------------------------------------------
create or replace function public.eh_admin(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select papel = 'admin' and not bloqueado and aprovado
                     from public.profiles where id = uid), false);
$$;

create or replace function public.esta_bloqueado(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select bloqueado from public.profiles where id = uid), false);
$$;

-- Quem pode usar o sistema: tem conta, foi aprovado e não está bloqueado.
-- É esta função que as políticas das tabelas de dados consultam — com ela,
-- "esperando aprovação" e "bloqueado" não leem nem gravam absolutamente
-- nada, mesmo chamando a API direto.
create or replace function public.pode_usar(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select aprovado and not bloqueado from public.profiles where id = uid), false);
$$;

-- Registra que esta pessoa usou o site agora.
--
-- `security definer` para poder escrever numa coluna que o trigger protege, e
-- `auth.uid()` lá dentro para que ninguém registre acesso no lugar de outro:
-- a função não recebe parâmetro nenhum, nem a data (quem dá a hora é o
-- `now()` do banco) nem de quem (quem diz é a sessão). O site chama isto uma
-- vez por visita; se a pessoa não entra, a coluna não se mexe sozinha.
create or replace function public.registrar_acesso()
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  quando timestamptz := now();
begin
  if auth.uid() is null then
    return null;                                  -- sem sessão não há o que registrar
  end if;
  update public.profiles set ultimo_acesso = quando where id = auth.uid();
  return quando;
end;
$$;

revoke all on function public.registrar_acesso() from public;
grant execute on function public.registrar_acesso() to authenticated;

-- Excluir uma conta, com tudo que ela guardou.
--
-- Precisa ser uma função `security definer` por um motivo simples: as
-- políticas das tabelas de dados só deixam cada um mexer no que é seu
-- (`auth.uid() = user_id`), então nem o administrador consegue apagar o
-- histórico de outra pessoa pela API — e deixar os dados órfãos seria pior do
-- que não excluir. Aqui dentro, a função confere quem está chamando antes de
-- apagar qualquer coisa.
--
-- O que ela NÃO faz: apagar o login da pessoa no Supabase Auth. Isso exigiria
-- a chave `service_role`, que nunca entra no site. Quem quiser remover de vez
-- apaga em Authentication > Users, no painel. Sem o perfil, a pessoa já não
-- entra: `pode_usar()` passa a ser falso para ela.
create or replace function public.excluir_conta(alvo uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.eh_admin(auth.uid()) then
    raise exception 'só quem administra pode excluir contas';
  end if;
  if alvo = auth.uid() then
    raise exception 'o administrador não pode excluir a própria conta';
  end if;
  if not exists (select 1 from public.profiles where id = alvo) then
    return false;
  end if;

  delete from public.analises where user_id = alvo;
  delete from public.favoritos where user_id = alvo;
  delete from public.exercicios where user_id = alvo;
  -- o convite volta a valer: o e-mail pode ser convidado de novo
  delete from public.convites
   where lower(email) = (select lower(email) from public.profiles where id = alvo);
  delete from public.profiles where id = alvo;
  return true;
end;
$$;

revoke all on function public.excluir_conta(uuid) from public;
grant execute on function public.excluir_conta(uuid) to authenticated;

-- ============================================================
-- 1b) config_sistema — a configuração que o administrador controla
--
-- Uma linha só (id = 1). Qualquer pessoa pode LER, inclusive quem ainda não
-- entrou: a tela de entrada precisa saber se o cadastro está aberto e qual
-- mensagem mostrar. Só administrador pode ESCREVER.
-- ============================================================
create table if not exists public.config_sistema (
  id int primary key default 1 check (id = 1),
  cadastro text not null default 'aprovacao' check (cadastro in ('livre', 'aprovacao', 'fechado')),
  mensagem_login text,
  modulos jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);
insert into public.config_sistema (id) values (1) on conflict (id) do nothing;
alter table public.config_sistema enable row level security;

drop policy if exists "todos leem a configuracao" on public.config_sistema;
create policy "todos leem a configuracao"
  on public.config_sistema for select
  using (true);

drop policy if exists "so admin muda a configuracao" on public.config_sistema;
create policy "so admin muda a configuracao"
  on public.config_sistema for update
  using (public.eh_admin()) with check (public.eh_admin());

-- ============================================================
-- 1c) convites — e-mails que o administrador libera de antemão
--
-- Serve aos modos "aprovacao" e "fechado": quem se cadastra com um e-mail
-- convidado já entra aprovado, sem esperar. Quem não foi convidado fica
-- aguardando (ou nem consegue se cadastrar, no modo fechado).
--
-- De propósito o convite guarda só o e-mail: a senha é a pessoa que cria,
-- no próprio cadastro. Em sistema nenhum o administrador deve saber a senha
-- de alguém.
-- ============================================================
create table if not exists public.convites (
  email text primary key,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  usado boolean not null default false,
  usado_em timestamptz
);
alter table public.convites enable row level security;

drop policy if exists "so admin ve convites" on public.convites;
create policy "so admin ve convites" on public.convites for select using (public.eh_admin());
drop policy if exists "so admin cria convites" on public.convites;
create policy "so admin cria convites" on public.convites for insert with check (public.eh_admin());
drop policy if exists "so admin apaga convites" on public.convites;
create policy "so admin apaga convites" on public.convites for delete using (public.eh_admin());


-- ============================================================
-- 1d) sugestoes — o que quem usa quer dizer para quem administra
-- ============================================================
-- Uma caixa de ideias, não um chat: a pessoa escreve e manda; quem administra
-- lê, marca como lida e apaga quando resolver. Fica no banco (e não num
-- e-mail) para não depender de serviço nenhum e para ninguém perder nada.
create table if not exists public.sugestoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  texto text not null,
  criado_em timestamptz not null default now(),
  lida boolean not null default false
);
alter table public.sugestoes enable row level security;
create index if not exists sugestoes_criado_em_idx on public.sugestoes(criado_em desc);

-- Quem assina a sugestão é o banco, não o formulário: o trigger carimba
-- autor, e-mail e data. Sem isto, daria para mandar uma sugestão em nome de
-- outra pessoa só mudando o que o navegador envia.
create or replace function public.sugestao_carimba_autor()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.email := (select email from public.profiles where id = auth.uid());
  new.criado_em := now();
  new.lida := false;
  return new;
end;
$$;

drop trigger if exists trg_sugestao_carimba_autor on public.sugestoes;
create trigger trg_sugestao_carimba_autor
  before insert on public.sugestoes
  for each row execute procedure public.sugestao_carimba_autor();

drop policy if exists "usuario manda a propria sugestao" on public.sugestoes;
create policy "usuario manda a propria sugestao"
  on public.sugestoes for insert
  with check (public.pode_usar());

drop policy if exists "cada um ve as suas e o admin ve todas" on public.sugestoes;
create policy "cada um ve as suas e o admin ve todas"
  on public.sugestoes for select
  using (public.eh_admin() or (auth.uid() = user_id and public.pode_usar()));

drop policy if exists "so admin marca sugestao como lida" on public.sugestoes;
create policy "so admin marca sugestao como lida"
  on public.sugestoes for update
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "so admin apaga sugestao" on public.sugestoes;
create policy "so admin apaga sugestao"
  on public.sugestoes for delete
  using (public.eh_admin());


drop policy if exists "usuario ve o proprio perfil" on public.profiles;
create policy "usuario ve o proprio perfil"
  on public.profiles for select
  using (auth.uid() = id or public.eh_admin());

drop policy if exists "usuario atualiza o proprio perfil" on public.profiles;
create policy "usuario atualiza o proprio perfil"
  on public.profiles for update
  using (auth.uid() = id or public.eh_admin());

-- Cria o perfil automaticamente quando alguém se cadastra (auth.users).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  modo text;
  convidado boolean;
  primeiro boolean;
begin
  select cadastro into modo from public.config_sistema where id = 1;
  select exists (select 1 from public.convites where lower(email) = lower(new.email) and not usado)
    into convidado;
  select not exists (select 1 from public.profiles) into primeiro;

  -- O PRIMEIRO cadastro do sistema vira o administrador, aprovado. Assim
  -- ninguém precisa abrir o SQL Editor para começar — e, como só funciona
  -- enquanto a tabela está vazia, não há como alguém "virar admin" depois
  -- por esse caminho.
  insert into public.profiles (id, email, papel, aprovado)
  values (
    new.id,
    new.email,
    case when primeiro then 'admin' else 'usuario' end,
    case when primeiro then true
         when convidado then true
         when coalesce(modo, 'aprovacao') = 'livre' then true
         else false end
  );

  if convidado then
    update public.convites set usado = true, usado_em = now()
     where lower(email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- Quem pode mudar o quê em `profiles`.
--
-- A política de update acima só diz QUAL LINHA pode ser alterada — ela não
-- impede que o dono da linha mande `plano = 'pro'`, `papel = 'admin'` ou
-- `bloqueado = false` pela API. Sem esta trava, qualquer pessoa logada se
-- promoveria a admin pelo Console do navegador. Então:
--
--   * usuário comum: qualquer mudança em plano/papel/bloqueio é revertida;
--   * admin: pode mudar plano, papel e bloqueio DOS OUTROS;
--   * admin NÃO muda o próprio papel nem se bloqueia — é o que garante que
--     sempre sobre pelo menos um admin com acesso (e evita o tiro no pé);
--   * o carimbo de quem bloqueou e quando é posto pelo banco, não pelo app.
--
-- Quem roda SQL direto no SQL Editor (papel postgres/supabase_admin) passa
-- por cima de tudo isto — é assim que o PRIMEIRO admin é criado.
-- ------------------------------------------------------------
-- ATENÇÃO: esta função é SECURITY INVOKER (o padrão) de propósito. Dentro
-- de uma função SECURITY DEFINER, `current_user` é o DONO da função, não
-- quem chamou — a trava abaixo nunca dispararia e qualquer usuário logado
-- se promoveria a admin pela API. Quem precisa ignorar o RLS aqui é só a
-- consulta de `eh_admin()`, que já é definer por conta própria.
create or replace function public.protege_campos_privilegiados()
returns trigger
language plpgsql set search_path = public
as $$
declare
  admin boolean;
begin
  if current_user <> 'authenticated' then
    return new;                                  -- SQL Editor / service_role: livre
  end if;

  admin := public.eh_admin(auth.uid());

  if not admin or new.id = auth.uid() then
    -- usuário comum em qualquer linha, ou admin mexendo na PRÓPRIA linha
    new.plano := old.plano;
    new.papel := old.papel;
    new.bloqueado := old.bloqueado;
    new.bloqueado_em := old.bloqueado_em;
    new.bloqueado_por := old.bloqueado_por;
    new.motivo_bloqueio := old.motivo_bloqueio;
    new.aprovado := old.aprovado;              -- ninguém se aprova sozinho
    new.modulos := old.modulos;                -- nem libera telas para si
    new.ultimo_acesso := old.ultimo_acesso;    -- só registrar_acesso() escreve
    return new;
  end if;

  -- admin mexendo em outra pessoa: nem o admin reescreve o último acesso
  new.ultimo_acesso := old.ultimo_acesso;
  if new.bloqueado is distinct from old.bloqueado then
    new.bloqueado_em := case when new.bloqueado then now() else null end;
    new.bloqueado_por := case when new.bloqueado then auth.uid() else null end;
    if not new.bloqueado then new.motivo_bloqueio := null; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_plano_selfupgrade on public.profiles;
drop function if exists public.prevent_plano_selfupgrade();
drop trigger if exists trg_protege_campos_privilegiados on public.profiles;
create trigger trg_protege_campos_privilegiados
  before update on public.profiles
  for each row execute procedure public.protege_campos_privilegiados();

-- Ninguém cria perfil pela API (quem cria é o trigger do cadastro) e
-- ninguém apaga perfil pela API: sem política de insert/delete, o RLS
-- recusa as duas coisas por padrão.

-- ============================================================
-- 2) analises — histórico de progressões analisadas
-- ============================================================
create table if not exists public.analises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tonalidade text not null,
  modo text not null,
  progressao text not null,
  instrumento text not null,
  nivel text not null,
  criado_em timestamptz not null default now()
);

alter table public.analises enable row level security;

drop policy if exists "usuario ve as proprias analises" on public.analises;
create policy "usuario ve as proprias analises"
  on public.analises for select
  using (auth.uid() = user_id and public.pode_usar());

drop policy if exists "usuario insere as proprias analises" on public.analises;
create policy "usuario insere as proprias analises"
  on public.analises for insert
  with check (auth.uid() = user_id and public.pode_usar());

drop policy if exists "usuario apaga as proprias analises" on public.analises;
create policy "usuario apaga as proprias analises"
  on public.analises for delete
  using (auth.uid() = user_id and public.pode_usar());

create index if not exists analises_user_id_idx on public.analises(user_id, criado_em desc);

-- ============================================================
-- 3) favoritos — fraseados marcados como favoritos
-- (guarda os parâmetros que recriam o fraseado, não o fraseado pronto —
--  a geração é determinística, então basta reproduzir a entrada)
-- ============================================================
create table if not exists public.favoritos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tonalidade text not null,
  modo text not null,
  progressao text not null,
  instrumento text not null,
  nivel text not null,
  phrase_index int not null,
  titulo text not null,
  criado_em timestamptz not null default now()
);

alter table public.favoritos enable row level security;

drop policy if exists "usuario ve os proprios favoritos" on public.favoritos;
create policy "usuario ve os proprios favoritos"
  on public.favoritos for select
  using (auth.uid() = user_id and public.pode_usar());

drop policy if exists "usuario insere os proprios favoritos" on public.favoritos;
create policy "usuario insere os proprios favoritos"
  on public.favoritos for insert
  with check (auth.uid() = user_id and public.pode_usar());

drop policy if exists "usuario apaga os proprios favoritos" on public.favoritos;
create policy "usuario apaga os proprios favoritos"
  on public.favoritos for delete
  using (auth.uid() = user_id and public.pode_usar());

create index if not exists favoritos_user_id_idx on public.favoritos(user_id, criado_em desc);

-- ============================================================
-- 4) exercicios — fraseados marcados para praticar, com status
-- ============================================================
create table if not exists public.exercicios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tonalidade text not null,
  modo text not null,
  progressao text not null,
  instrumento text not null,
  nivel text not null,
  phrase_index int not null,
  titulo text not null,
  status text not null default 'pendente' check (status in ('pendente', 'praticando', 'dominado')),
  criado_em timestamptz not null default now()
);

alter table public.exercicios enable row level security;

drop policy if exists "usuario ve os proprios exercicios" on public.exercicios;
create policy "usuario ve os proprios exercicios"
  on public.exercicios for select
  using (auth.uid() = user_id and public.pode_usar());

drop policy if exists "usuario insere os proprios exercicios" on public.exercicios;
create policy "usuario insere os proprios exercicios"
  on public.exercicios for insert
  with check (auth.uid() = user_id and public.pode_usar());

drop policy if exists "usuario atualiza os proprios exercicios" on public.exercicios;
create policy "usuario atualiza os proprios exercicios"
  on public.exercicios for update
  using (auth.uid() = user_id and public.pode_usar());

drop policy if exists "usuario apaga os proprios exercicios" on public.exercicios;
create policy "usuario apaga os proprios exercicios"
  on public.exercicios for delete
  using (auth.uid() = user_id and public.pode_usar());

create index if not exists exercicios_user_id_idx on public.exercicios(user_id, criado_em desc);

-- ============================================================
-- Checklist manual para confirmar o isolamento entre contas
-- (não dá para automatizar isso sem um projeto Supabase de teste):
--
-- 1. Crie a Conta A e a Conta B pelo próprio site (botão "Entrar" > "Criar conta").
-- 2. Como Conta A: analise uma progressão e clique em "Salvar no histórico".
-- 3. Saia e entre como Conta B: a aba Histórico deve aparecer VAZIA.
-- 4. Repita para Favoritos e Meus Exercícios.
-- Se a Conta B enxergar qualquer dado da Conta A, pare e revise as
-- políticas de RLS acima antes de usar o sistema com dados reais.
-- ============================================================

-- ============================================================
-- O PRIMEIRO ADMIN
--
-- Não precisa fazer nada: a PRIMEIRA conta criada no site vira o
-- administrador, já aprovada (é o trigger handle_new_user acima que faz
-- isso, e só enquanto a tabela de perfis está vazia).
--
-- Se um dia precisar de outro admin pela marra — perdeu o acesso, apagou a
-- conta —, rode aqui no SQL Editor, trocando pelo e-mail:
--
--   update public.profiles set papel = 'admin', aprovado = true, bloqueado = false
--    where email = 'voce@exemplo.com';
--
-- Confira quem é quem:
--
--   select email, papel, aprovado, bloqueado from public.profiles order by criado_em;
--
-- O SQL Editor passa por cima do trigger de proteção de propósito: é a
-- porta dos fundos de quem é dono do banco.
-- ============================================================

-- ============================================================
-- A CONFIGURAÇÃO DO SISTEMA
--
-- Tudo pela tela "Administração" do site, aba "Sistema". Pelo SQL Editor,
-- se preferir:
--
--   update public.config_sistema set cadastro = 'livre'      where id = 1;  -- qualquer um entra
--   update public.config_sistema set cadastro = 'aprovacao'  where id = 1;  -- padrão
--   update public.config_sistema set cadastro = 'fechado'    where id = 1;  -- só convidados
--   update public.config_sistema set mensagem_login = 'Aula na quinta, 19h.' where id = 1;
--
-- Convidar alguém (no modo fechado é o único jeito de entrar; nos outros,
-- o convite faz a pessoa já entrar aprovada):
--
--   insert into public.convites (email) values ('aluno@exemplo.com');
--
-- Aprovar quem está esperando:
--
--   update public.profiles set aprovado = true where email = 'aluno@exemplo.com';
-- ============================================================

-- ============================================================
-- Bloquear alguém pelo SQL Editor (o normal é fazer pela tela):
--
--   update public.profiles set bloqueado = true, bloqueado_em = now(),
--          motivo_bloqueio = 'uso indevido'
--    where email = 'alguem@exemplo.com';
--
-- O bloqueio vale na hora para os dados (as políticas acima recusam
-- qualquer leitura/escrita de quem está bloqueado) e o site desconecta a
-- pessoa assim que ela abre ou volta para a aba.
-- ============================================================
