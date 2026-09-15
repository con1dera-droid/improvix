/**
 * IMPROVIX — configuração do Supabase (Etapa 4)
 *
 * Troque os dois valores abaixo pelos do SEU projeto Supabase:
 * Project Settings > API > "Project URL" e "anon public" key.
 * Veja o passo a passo em docs/etapa4-supabase.md.
 *
 * A chave "anon" é pública por design — ela só permite o que as políticas
 * de RLS autorizarem (ver sql/schema.sql). Por isso este arquivo pode ficar
 * versionado normalmente; não é um segredo real (diferente da "service_role
 * key", que este projeto NUNCA usa no navegador).
 *
 * Enquanto os valores abaixo forem os de exemplo, o site funciona
 * normalmente (Etapas 1-3) e o login fica desativado com uma mensagem
 * explicando o que falta configurar.
 */
window.IL_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_ANON_AQUI'
};
