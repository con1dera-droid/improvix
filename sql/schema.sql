-- ImprovisaLab — Etapa 4 (contas de usuário)
-- Rode este script inteiro no SQL Editor do seu projeto Supabase
-- (Project > SQL Editor > New query > colar tudo > Run).
--
-- Cria 4 tabelas (profiles, analises, favoritos, exercicios), todas com
-- Row Level Security (RLS) ligado: cada usuário só enxerga e só grava as
-- próprias linhas. Isso é aplicado DENTRO do banco — mesmo que alguém
-- burle a interface e chame a API diretamente, o Postgres recusa.

-- ============================================================
-- 1) profiles — um perfil por usuário (criado automaticamente no cadastro)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plano text not null default 'gratuito' check (plano in ('gratuito', 'pro')),
  criado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "usuario ve o proprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuario atualiza o proprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

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

create policy "usuario ve as proprias analises"
  on public.analises for select
  using (auth.uid() = user_id);

create policy "usuario insere as proprias analises"
  on public.analises for insert
  with check (auth.uid() = user_id);

create policy "usuario apaga as proprias analises"
  on public.analises for delete
  using (auth.uid() = user_id);

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

create policy "usuario ve os proprios favoritos"
  on public.favoritos for select
  using (auth.uid() = user_id);

create policy "usuario insere os proprios favoritos"
  on public.favoritos for insert
  with check (auth.uid() = user_id);

create policy "usuario apaga os proprios favoritos"
  on public.favoritos for delete
  using (auth.uid() = user_id);

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

create policy "usuario ve os proprios exercicios"
  on public.exercicios for select
  using (auth.uid() = user_id);

create policy "usuario insere os proprios exercicios"
  on public.exercicios for insert
  with check (auth.uid() = user_id);

create policy "usuario atualiza os proprios exercicios"
  on public.exercicios for update
  using (auth.uid() = user_id);

create policy "usuario apaga os proprios exercicios"
  on public.exercicios for delete
  using (auth.uid() = user_id);

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
