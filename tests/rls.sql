-- ============================================================================
-- Teste das regras de acesso do banco (RLS), rodado num PostgreSQL de verdade.
--
-- Até aqui, a separação entre contas só podia ser conferida na mão, num
-- projeto Supabase real (era o que dizia o checklist no fim do schema.sql).
-- Este arquivo fecha essa lacuna: sobe o mínimo do Supabase (o schema `auth`,
-- a função auth.uid() e o papel `authenticated`), aplica o sql/schema.sql do
-- projeto e ataca o banco como cada tipo de usuário — inclusive tentando
-- exatamente o que um espertinho tentaria pelo Console do navegador.
--
-- Como rodar (precisa de um postgres local; ver tests/rls.sh):
--     bash tests/rls.sh
--
-- Ele FALHA (sai com erro) se qualquer regra deixar passar o que não devia.
-- ============================================================================

\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

create temp table resultado (ok boolean, msg text);
-- o papel `authenticated` também precisa escrever aqui enquanto testamos
grant all on resultado to authenticated;

-- ---------------------------------------------------------------- cenário
insert into auth.users (email) values ('admin@teste'), ('comum@teste'), ('alvo@teste');
-- o primeiro admin nasce do SQL Editor, como manda o schema
update public.profiles set papel = 'admin' where email = 'admin@teste';

select id as admin_id from public.profiles where email = 'admin@teste' \gset
select id as comum_id from public.profiles where email = 'comum@teste' \gset
select id as alvo_id  from public.profiles where email = 'alvo@teste'  \gset

insert into public.analises (user_id, tonalidade, modo, progressao, instrumento, nivel)
values (:'comum_id', 'C', 'maior', 'C | G', 'teclado', 'intermediario'),
       (:'alvo_id',  'G', 'maior', 'G | D', 'teclado', 'intermediario');

do $checagens$
declare
  admin_id uuid; comum_id uuid; alvo_id uuid;
  n int; txt text; b boolean; b2 boolean;
begin
  select id into admin_id from public.profiles where email = 'admin@teste';
  select id into comum_id from public.profiles where email = 'comum@teste';
  select id into alvo_id  from public.profiles where email = 'alvo@teste';

  -- ======================= como usuário comum =======================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', comum_id::text, true);

  select count(*) into n from public.profiles;
  insert into resultado values (n = 1, 'usuário comum enxerga só o próprio perfil (viu ' || n || ')');

  update public.profiles set papel = 'admin' where id = comum_id;
  select papel into txt from public.profiles where id = comum_id;
  insert into resultado values (txt = 'usuario', 'usuário comum NÃO se promove a admin pela API (ficou ' || txt || ')');

  update public.profiles set plano = 'pro' where id = comum_id;
  select plano into txt from public.profiles where id = comum_id;
  insert into resultado values (txt = 'gratuito', 'usuário comum NÃO se promove a Pro pela API (ficou ' || txt || ')');

  update public.profiles set bloqueado = true where id = alvo_id;
  set local role postgres;
  select bloqueado into b from public.profiles where id = alvo_id;
  set local role authenticated;
  insert into resultado values (b = false, 'usuário comum NÃO bloqueia outra pessoa');

  select count(*) into n from public.analises;
  insert into resultado values (n = 1, 'usuário comum enxerga só as próprias análises (viu ' || n || ')');

  begin
    insert into public.analises (user_id, tonalidade, modo, progressao, instrumento, nivel)
    values (alvo_id, 'C', 'maior', 'C', 'teclado', 'intermediario');
    insert into resultado values (false, 'usuário comum NÃO grava análise no nome de outro');
  exception when others then
    insert into resultado values (true, 'usuário comum NÃO grava análise no nome de outro');
  end;

  -- ============================ como admin ============================
  perform set_config('request.jwt.claim.sub', admin_id::text, true);

  select count(*) into n from public.profiles;
  insert into resultado values (n = 3, 'admin enxerga todos os perfis (viu ' || n || ' de 3)');

  update public.profiles set plano = 'pro' where id = comum_id;
  select plano into txt from public.profiles where id = comum_id;
  insert into resultado values (txt = 'pro', 'admin promove outro a Pro');

  update public.profiles set plano = 'gratuito' where id = comum_id;
  select plano into txt from public.profiles where id = comum_id;
  insert into resultado values (txt = 'gratuito', 'admin devolve outro ao Gratuito');

  update public.profiles set papel = 'admin' where id = comum_id;
  select papel into txt from public.profiles where id = comum_id;
  insert into resultado values (txt = 'admin', 'admin promove outro a admin');
  update public.profiles set papel = 'usuario' where id = comum_id;

  update public.profiles set bloqueado = true, motivo_bloqueio = 'teste' where id = alvo_id;
  select bloqueado, bloqueado_por = admin_id and bloqueado_em is not null
    into b, b2 from public.profiles where id = alvo_id;
  insert into resultado values (b, 'admin bloqueia outra pessoa');
  insert into resultado values (b2, 'o banco carimba quem bloqueou e quando (não o app)');

  update public.profiles set papel = 'usuario' where id = admin_id;
  select papel into txt from public.profiles where id = admin_id;
  insert into resultado values (txt = 'admin', 'admin NÃO muda o próprio papel (evita ficar sem admin)');

  update public.profiles set bloqueado = true where id = admin_id;
  select bloqueado into b from public.profiles where id = admin_id;
  insert into resultado values (b = false, 'admin NÃO se bloqueia');

  select count(*) into n from public.analises;
  insert into resultado values (n = 0, 'admin NÃO enxerga o estudo dos outros (privacidade; viu ' || n || ')');

  -- ===================== como o usuário bloqueado =====================
  perform set_config('request.jwt.claim.sub', alvo_id::text, true);

  select count(*) into n from public.analises;
  insert into resultado values (n = 0, 'bloqueado perde acesso aos próprios dados na hora (viu ' || n || ')');

  begin
    insert into public.analises (user_id, tonalidade, modo, progressao, instrumento, nivel)
    values (alvo_id, 'C', 'maior', 'C', 'teclado', 'intermediario');
    insert into resultado values (false, 'bloqueado NÃO grava nada');
  exception when others then
    insert into resultado values (true, 'bloqueado NÃO grava nada');
  end;

  update public.profiles set bloqueado = false where id = alvo_id;
  select bloqueado into b from public.profiles where id = alvo_id;
  insert into resultado values (b = true, 'bloqueado NÃO se desbloqueia');

  select count(*) into n from public.profiles;
  insert into resultado values (n = 1, 'bloqueado ainda vê o próprio perfil, para o site saber avisá-lo');

  -- ================== desbloqueio devolve o acesso ==================
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  update public.profiles set bloqueado = false where id = alvo_id;

  perform set_config('request.jwt.claim.sub', alvo_id::text, true);
  select count(*) into n from public.analises;
  insert into resultado values (n = 1, 'desbloqueado volta a ver os próprios dados (viu ' || n || ')');

  set local role postgres;
  select bloqueado_em is null and motivo_bloqueio is null into b from public.profiles where id = alvo_id;
  insert into resultado values (b, 'desbloquear limpa o carimbo e o motivo');

  -- ===================== visitante (sem sessão) =====================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from public.profiles;
  insert into resultado values (n = 0, 'sem sessão não se enxerga perfil nenhum (viu ' || n || ')');
  select count(*) into n from public.analises;
  insert into resultado values (n = 0, 'sem sessão não se enxerga dado nenhum (viu ' || n || ')');

  set local role postgres;
end
$checagens$;

\set QUIET off
\echo ''
select case when ok then 'ok    ' else 'FALHA ' end || msg as "regras de acesso do banco" from resultado;

do $$
declare falhas int;
begin
  select count(*) into falhas from resultado where not ok;
  if falhas > 0 then
    raise exception '% regra(s) de acesso falharam — NÃO publique assim', falhas;
  end if;
  raise notice 'Todas as % regras de acesso passaram.', (select count(*) from resultado);
end $$;
