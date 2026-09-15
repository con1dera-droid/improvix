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
  select coalesce((select papel = 'admin' and not bloqueado from public.profiles where id = uid), false);
$$;

create or replace function public.esta_bloqueado(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select bloqueado from public.profiles where id = uid), false);
$$;

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
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
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
    return new;
  end if;

  -- admin mexendo em outra pessoa: carimba o bloqueio no banco
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
  using (auth.uid() = user_id and not public.esta_bloqueado());

drop policy if exists "usuario insere as proprias analises" on public.analises;
create policy "usuario insere as proprias analises"
  on public.analises for insert
  with check (auth.uid() = user_id and not public.esta_bloqueado());

drop policy if exists "usuario apaga as proprias analises" on public.analises;
create policy "usuario apaga as proprias analises"
  on public.analises for delete
  using (auth.uid() = user_id and not public.esta_bloqueado());

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
  using (auth.uid() = user_id and not public.esta_bloqueado());

drop policy if exists "usuario insere os proprios favoritos" on public.favoritos;
create policy "usuario insere os proprios favoritos"
  on public.favoritos for insert
  with check (auth.uid() = user_id and not public.esta_bloqueado());

drop policy if exists "usuario apaga os proprios favoritos" on public.favoritos;
create policy "usuario apaga os proprios favoritos"
  on public.favoritos for delete
  using (auth.uid() = user_id and not public.esta_bloqueado());

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
  using (auth.uid() = user_id and not public.esta_bloqueado());

drop policy if exists "usuario insere os proprios exercicios" on public.exercicios;
create policy "usuario insere os proprios exercicios"
  on public.exercicios for insert
  with check (auth.uid() = user_id and not public.esta_bloqueado());

drop policy if exists "usuario atualiza os proprios exercicios" on public.exercicios;
create policy "usuario atualiza os proprios exercicios"
  on public.exercicios for update
  using (auth.uid() = user_id and not public.esta_bloqueado());

drop policy if exists "usuario apaga os proprios exercicios" on public.exercicios;
create policy "usuario apaga os proprios exercicios"
  on public.exercicios for delete
  using (auth.uid() = user_id and not public.esta_bloqueado());

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
-- O PRIMEIRO ADMIN — o único passo que tem de ser feito aqui no SQL Editor
--
-- De propósito não existe "virar admin" pelo site: o trigger acima recusa
-- qualquer mudança de papel vinda da API. Então o primeiro admin nasce
-- daqui. Crie a sua conta normalmente pelo site (botão "Entrar" > "Criar
-- conta"), e depois rode UMA VEZ, trocando pelo seu e-mail:
--
--   update public.profiles set papel = 'admin' where email = 'voce@exemplo.com';
--
-- Confira:
--
--   select email, papel, plano, bloqueado from public.profiles order by criado_em;
--
-- Daí em diante, esse admin cria os outros pela tela "Administração" do
-- próprio site — inclusive promover a Pro e bloquear/desbloquear gente.
--
-- Se um dia perder o acesso de admin (por exemplo, apagou a conta), é só
-- rodar o mesmo update de novo: o SQL Editor não passa pelo trigger.
-- ============================================================

-- ============================================================
-- Plano Pro
--
-- Pelo site: tela "Administração", botão "Tornar Pro" em cada usuário.
-- Pelo SQL Editor, se preferir:
--
--   update public.profiles set plano = 'pro' where email = 'alguem@exemplo.com';
--   update public.profiles set plano = 'gratuito' where email = 'alguem@exemplo.com';
--
-- Ver docs/etapa5-planos.md.
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
