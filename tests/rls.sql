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
-- O PRIMEIRO cadastro vira o administrador sozinho (é o trigger do schema).
insert into auth.users (email) values ('admin@teste');
-- Os seguintes entram pelo modo padrão ('aprovacao'): nascem esperando.
insert into auth.users (email) values ('comum@teste'), ('alvo@teste');
-- Um convidado: o admin libera o e-mail ANTES de a pessoa se cadastrar.
insert into public.convites (email) values ('convidado@teste');
insert into auth.users (email) values ('convidado@teste');

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

  -- ================= o sistema fechado: quem entra ==================
  select papel = 'admin' and aprovado into b from public.profiles where email = 'admin@teste';
  insert into resultado values (b, 'o PRIMEIRO cadastro vira administrador, aprovado');

  select aprovado into b from public.profiles where email = 'comum@teste';
  insert into resultado values (b = false, 'cadastro comum nasce esperando aprovação');

  select aprovado into b from public.profiles where email = 'convidado@teste';
  insert into resultado values (b, 'quem foi convidado já nasce aprovado');

  select usado into b from public.convites where email = 'convidado@teste';
  insert into resultado values (b, 'o convite é marcado como usado');

  -- ============== quem está esperando não lê NADA ==============
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', comum_id::text, true);

  select count(*) into n from public.analises;
  insert into resultado values (n = 0, 'quem espera aprovação NÃO lê os próprios dados (viu ' || n || ')');

  begin
    insert into public.analises (user_id, tonalidade, modo, progressao, instrumento, nivel)
    values (comum_id, 'C', 'maior', 'C', 'teclado', 'intermediario');
    insert into resultado values (false, 'quem espera aprovação NÃO grava nada');
  exception when others then
    insert into resultado values (true, 'quem espera aprovação NÃO grava nada');
  end;

  update public.profiles set aprovado = true where id = comum_id;
  select aprovado into b from public.profiles where id = comum_id;
  insert into resultado values (b = false, 'ninguém se aprova sozinho pela API');

  select count(*) into n from public.profiles;
  insert into resultado values (n = 1, 'quem espera ainda vê o próprio perfil, para o site avisá-lo');

  -- ================= a configuração do sistema =================
  select count(*) into n from public.config_sistema;
  insert into resultado values (n = 1, 'qualquer um lê a configuração (a tela de entrada precisa dela)');

  update public.config_sistema set cadastro = 'livre' where id = 1;
  set local role postgres;
  select cadastro into txt from public.config_sistema where id = 1;
  set local role authenticated;
  insert into resultado values (txt = 'aprovacao', 'usuário comum NÃO muda a configuração (ficou ' || txt || ')');

  begin
    insert into public.convites (email) values ('invasor@teste');
    insert into resultado values (false, 'usuário comum NÃO cria convite');
  exception when others then
    insert into resultado values (true, 'usuário comum NÃO cria convite');
  end;

  select count(*) into n from public.convites;
  insert into resultado values (n = 0, 'usuário comum NÃO enxerga a lista de convidados (viu ' || n || ')');

  -- o admin aprova os dois, e o teste segue como antes
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  update public.profiles set aprovado = true where id in (comum_id, alvo_id);
  set local role postgres;
  select count(*) into n from public.profiles where aprovado;
  set local role authenticated;
  insert into resultado values (n = 4, 'admin aprova quem está esperando (' || n || ' aprovados)');

  update public.config_sistema set cadastro = 'livre', mensagem_login = 'Aula quinta, 19h' where id = 1;
  select cadastro into txt from public.config_sistema where id = 1;
  insert into resultado values (txt = 'livre', 'admin muda a configuração do sistema');
  update public.config_sistema set cadastro = 'aprovacao' where id = 1;

  insert into public.convites (email) values ('novo@teste');
  select count(*) into n from public.convites;
  insert into resultado values (n = 2, 'admin convida alguém pelo e-mail (' || n || ' convites)');

  -- ======================= como usuário comum =======================
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
  insert into resultado values (n = 4, 'admin enxerga todos os perfis (viu ' || n || ' de 4)');

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

  -- ===================== último acesso =====================
  -- A data só pode nascer da função registrar_acesso(), com o relógio do
  -- banco. Se desse para escrever na coluna, a lista do admin viraria ficção.
  perform set_config('request.jwt.claim.sub', alvo_id::text, true);
  perform public.registrar_acesso();
  set local role postgres;
  select ultimo_acesso is not null into b from public.profiles where id = alvo_id;
  insert into resultado values (b, 'registrar_acesso() marca a hora de quem chamou');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', alvo_id::text, true);
  update public.profiles set ultimo_acesso = '2020-01-01'::timestamptz where id = alvo_id;
  set local role postgres;
  select ultimo_acesso > '2024-01-01'::timestamptz into b from public.profiles where id = alvo_id;
  insert into resultado values (b, 'ninguém inventa a própria data de acesso (o trigger reverte)');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  update public.profiles set ultimo_acesso = '2020-01-01'::timestamptz where id = alvo_id;
  set local role postgres;
  select ultimo_acesso > '2024-01-01'::timestamptz into b from public.profiles where id = alvo_id;
  insert into resultado values (b, 'nem o admin reescreve o acesso de outra pessoa');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  select count(*) into n from public.profiles where ultimo_acesso is not null;
  insert into resultado values (n >= 1, 'o admin enxerga o último acesso das contas (viu ' || n || ')');

  -- ===================== sugestões =====================
  -- A caixa de ideias: quem está liberado manda, cada um vê só a sua, o admin
  -- vê todas e é o único que marca como lida ou apaga. E quem assina é o
  -- banco — não dá para mandar sugestão em nome de outra pessoa.
  perform set_config('request.jwt.claim.sub', alvo_id::text, true);
  insert into public.sugestoes (texto, user_id, email)
    values ('seria bom ter metrônomo visual', admin_id, 'mentira@teste.com');
  set local role postgres;
  select count(*) into n from public.sugestoes where user_id = alvo_id;
  insert into resultado values (n = 1, 'a sugestão é carimbada com quem realmente mandou');
  select email = 'alvo@teste' into b from public.sugestoes limit 1;
  insert into resultado values (b, 'e com o e-mail de verdade dessa pessoa');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', alvo_id::text, true);
  select count(*) into n from public.sugestoes;
  insert into resultado values (n = 1, 'quem mandou enxerga a própria sugestão (viu ' || n || ')');

  perform set_config('request.jwt.claim.sub', comum_id::text, true);
  select count(*) into n from public.sugestoes;
  insert into resultado values (n = 0, 'outra pessoa NÃO enxerga a sugestão alheia (viu ' || n || ')');

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  select count(*) into n from public.sugestoes;
  insert into resultado values (n = 1, 'o admin enxerga todas as sugestões (viu ' || n || ')');

  perform set_config('request.jwt.claim.sub', alvo_id::text, true);
  update public.sugestoes set lida = true;
  set local role postgres;
  select count(*) into n from public.sugestoes where lida;
  insert into resultado values (n = 0, 'usuário comum NÃO marca sugestão como lida');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', alvo_id::text, true);
  delete from public.sugestoes;
  set local role postgres;
  select count(*) into n from public.sugestoes;
  insert into resultado values (n = 1, 'usuário comum NÃO apaga sugestão');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  update public.sugestoes set lida = true;
  set local role postgres;
  select count(*) into n from public.sugestoes where lida;
  insert into resultado values (n = 1, 'o admin marca como lida');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  delete from public.sugestoes;
  set local role postgres;
  select count(*) into n from public.sugestoes;
  insert into resultado values (n = 0, 'e o admin apaga quando resolve');

  -- ===================== excluir conta =====================
  -- A exclusão é a ação mais perigosa da tela: a regra tem de estar aqui, e
  -- não no botão. Quem não é admin não apaga ninguém, nem a si mesmo; o admin
  -- não apaga a própria conta (senão a plataforma fica sem dono); e quando
  -- apaga alguém, os dados daquela pessoa vão junto, sem sobrar órfão.
  perform set_config('request.jwt.claim.sub', alvo_id::text, true);
  begin
    perform public.excluir_conta(admin_id);
    insert into resultado values (false, 'usuário comum NÃO exclui a conta de outra pessoa');
  exception when others then
    insert into resultado values (true, 'usuário comum NÃO exclui a conta de outra pessoa');
  end;

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  begin
    perform public.excluir_conta(admin_id);
    insert into resultado values (false, 'o admin NÃO exclui a própria conta');
  exception when others then
    insert into resultado values (true, 'o admin NÃO exclui a própria conta');
  end;

  -- o alvo tem dados guardados antes de ser excluído
  set local role postgres;
  select count(*) into n from public.analises where user_id = alvo_id;
  insert into resultado values (n >= 1, 'antes de excluir, a conta tinha dados (' || n || ')');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  select public.excluir_conta(alvo_id) into b;
  insert into resultado values (b, 'o admin exclui a conta de outra pessoa');

  set local role postgres;
  select count(*) into n from public.profiles where id = alvo_id;
  insert into resultado values (n = 0, 'o perfil sai da lista');
  select count(*) into n from public.analises where user_id = alvo_id;
  insert into resultado values (n = 0, 'e os dados dela vão junto, sem sobrar órfão (' || n || ')');

  -- ===================== visitante (sem sessão) =====================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from public.profiles;
  insert into resultado values (n = 0, 'sem sessão não se enxerga perfil nenhum (viu ' || n || ')');
  select count(*) into n from public.analises;
  insert into resultado values (n = 0, 'sem sessão não se enxerga dado nenhum (viu ' || n || ')');
  select count(*) into n from public.convites;
  insert into resultado values (n = 0, 'sem sessão não se enxerga a lista de convidados (viu ' || n || ')');
  select count(*) into n from public.config_sistema;
  insert into resultado values (n = 1, 'sem sessão se lê a configuração — e só ela (a tela de entrada)');

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
