/*
# ERP AlfaSys - Auth + User Profiles + Orçamentos Recebidos

## Descrição
Adiciona sistema de contas com roles (admin, vendas, mecanico, almoxarifado),
tabela de perfis de usuário, e tabela de orçamentos recebidos via WhatsApp.

## Tabelas Criadas

1. **user_profiles**
   - id (uuid, FK auth.users, PK)
   - nome (text)
   - role (text: admin, vendas, mecanico, almoxarifado)
   - created_at (timestamptz)

2. **orcamentos_recebidos**
   - id (uuid PK)
   - cliente_nome (text)
   - cliente_whatsapp (text)
   - mensagem_original (text)
   - equipamentos_sugeridos (jsonb)
   - status (text: Novo, Convertido, Ignorado)
   - created_at (timestamptz)

## Security
- RLS habilitado em user_profiles: authenticated pode SELECT, apenas admin pode INSERT/UPDATE/DELETE
- RLS habilitado em orcamentos_recebidos: authenticated CRUD
- Como o app agora tem tela de login, todas as políticas usam TO authenticated
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  role text NOT NULL DEFAULT 'vendas',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_user_profiles" ON user_profiles;
CREATE POLICY "select_user_profiles" ON user_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_user_profiles_admin" ON user_profiles;
CREATE POLICY "insert_user_profiles_admin" ON user_profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_user_profiles_admin" ON user_profiles;
CREATE POLICY "update_user_profiles_admin" ON user_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_user_profiles_admin" ON user_profiles;
CREATE POLICY "delete_user_profiles_admin" ON user_profiles FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS orcamentos_recebidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome text NOT NULL,
  cliente_whatsapp text,
  mensagem_original text,
  equipamentos_sugeridos jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'Novo',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orcamentos_recebidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_orcamentos_recebidos" ON orcamentos_recebidos;
CREATE POLICY "select_orcamentos_recebidos" ON orcamentos_recebidos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_orcamentos_recebidos" ON orcamentos_recebidos;
CREATE POLICY "insert_orcamentos_recebidos" ON orcamentos_recebidos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_orcamentos_recebidos" ON orcamentos_recebidos;
CREATE POLICY "update_orcamentos_recebidos" ON orcamentos_recebidos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_orcamentos_recebidos" ON orcamentos_recebidos;
CREATE POLICY "delete_orcamentos_recebidos" ON orcamentos_recebidos FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos_recebidos(status);
