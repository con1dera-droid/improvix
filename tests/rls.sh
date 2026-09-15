#!/usr/bin/env bash
# Roda tests/rls.sql num PostgreSQL local, para conferir as regras de acesso
# do banco (RLS) sem precisar de um projeto Supabase de verdade.
#
#   bash tests/rls.sh
#
# Precisa de um postgres rodando e do psql. No Mac:  brew install postgresql@16
# && brew services start postgresql@16. No Linux: apt install postgresql.
set -euo pipefail
cd "$(dirname "$0")/.."

PSQL=${PSQL:-psql}
DB=${DB:-improvix_teste}

if ! command -v "$PSQL" >/dev/null; then
  echo "psql não encontrado. Instale o PostgreSQL para rodar este teste." >&2
  exit 2
fi

echo "== recriando o banco de teste ($DB)"
$PSQL -q -d postgres -c "drop database if exists $DB" >/dev/null
$PSQL -q -d postgres -c "create database $DB" >/dev/null

echo "== subindo o mínimo do Supabase (schema auth, auth.uid(), papel authenticated)"
$PSQL -q -v ON_ERROR_STOP=1 -d "$DB" <<'SQL' >/dev/null
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
grant usage on schema public, auth to authenticated;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on functions to authenticated;
SQL

echo "== aplicando sql/schema.sql (duas vezes, para conferir que é idempotente)"
$PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f sql/schema.sql 2>&1 | grep -v NOTICE || true
$PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f sql/schema.sql 2>&1 | grep -v NOTICE || true

echo "== atacando o banco como cada tipo de usuário"
$PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/rls.sql
