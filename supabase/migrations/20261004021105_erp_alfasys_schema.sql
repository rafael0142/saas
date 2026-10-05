/*
# ERP Locação AlfaSys - Schema Completo

## Descrição
Cria o schema completo do ERP de locação de equipamentos, incluindo clientes,
equipamentos, locações (contratos de lote), estoque de peças, ordens de oficina,
transações de caixa e configuração de vitrines climáticas para CRM.

## Tabelas Criadas

1. **categorias** - Categorias de equipamentos (auxiliar)
   - id (PK), nome, cor_hex

2. **clientes**
   - id (PK), nome_razao_social, cnpj (Único), email,
   - status_financeiro (Enum: Adimplente, Inadimplente, Bloqueado),
   - imagem_buffer (Base64), whatsapp (Apenas números DDI+DDD)

3. **equipamentos**
   - id (PK), nome_modelo, codigo_patrimonio (Único),
   - status_atual (Enum: Disponível, Alugado, Oficina),
   - categoria_id (FK), imagem_url

4. **locacoes**
   - id (PK), numero_contrato (String agrupa lote),
   - cliente_id (FK), equipamento_id (FK),
   - valor_aluguel_base, valor_frete_logistico, dias_vigencia, data_fim,
   - status (Enum: Ativo, Encerrado, Atrasado),
   - regiao_entrega, checklist_saida_ok (Bool), checklist_saida_obs,
   - motorista_entrega, data_recebimento_obra, data_solicitacao_retirada, motorista_coleta

5. **estoque_pecas**
   - sku (PK String), nome, marca, estoque_atual, estoque_minimo,
   - preco_custo, preco_venda

6. **ordens_oficina**
   - id (PK), equipamento_id (FK), locacao_id (FK nulável),
   - descricao_problema, status (Enum: Aberta, Em Andamento, Concluida),
   - valor_pecas, valor_mao_de_obra, revisao_pos_locacao (Bool)

7. **caixa_transacoes**
   - id (PK), sessao_id, numero_contrato, cliente_id (FK),
   - valor_aluguel_base, valor_frete_total, valor_pecas_oficina,
   - valor_total_consolidado, forma_pagamento,
   - status (Enum: Pendente, Pago)

8. **configuracao_vitrines_climaticas**
   - tipo_clima (Enum: Sol, Chuva, Nublado),
   - lista_equipamentos_sugeridos (JSON),
   - desconto_porcentagem, mensagem_customizada_bot

## Segurança
- RLS habilitado em todas as tabelas.
- App sem tela de login (single-tenant): políticas TO anon, authenticated com USING(true).
- Dados são intencionalmente públicos dentro do ERP.
*/

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE status_financeiro_enum AS ENUM ('Adimplente', 'Inadimplente', 'Bloqueado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_equipamento_enum AS ENUM ('Disponivel', 'Alugado', 'Oficina');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_locacao_enum AS ENUM ('Ativo', 'Encerrado', 'Atrasado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_expedicao_enum AS ENUM ('Aguardando', 'Em Transito', 'Entregue na Obra', 'Atrasado', 'Coleta Solicitada', 'Coletado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_os_enum AS ENUM ('Aberta', 'Em Andamento', 'Concluida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_caixa_enum AS ENUM ('Pendente', 'Pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_clima_enum AS ENUM ('Sol', 'Chuva', 'Nublado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forma_pagamento_enum AS ENUM ('Boleto', 'Pix', 'Cartao', 'Dinheiro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- CATEGORIAS (auxiliar)
-- ============================================

CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor_hex text DEFAULT '#3b82f6'
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_categorias" ON categorias;
CREATE POLICY "anon_select_categorias" ON categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_categorias" ON categorias FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_categorias" ON categorias FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_categorias" ON categorias FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- CLIENTES
-- ============================================

CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_razao_social text NOT NULL,
  cnpj text UNIQUE,
  email text,
  status_financeiro status_financeiro_enum DEFAULT 'Adimplente',
  imagem_buffer text,
  whatsapp text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_clientes" ON clientes;
CREATE POLICY "anon_select_clientes" ON clientes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clientes" ON clientes;
CREATE POLICY "anon_insert_clientes" ON clientes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clientes" ON clientes;
CREATE POLICY "anon_update_clientes" ON clientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clientes" ON clientes;
CREATE POLICY "anon_delete_clientes" ON clientes FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- EQUIPAMENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_modelo text NOT NULL,
  codigo_patrimonio text UNIQUE NOT NULL,
  status_atual status_equipamento_enum DEFAULT 'Disponivel',
  categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL,
  imagem_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_equipamentos" ON equipamentos;
CREATE POLICY "anon_select_equipamentos" ON equipamentos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_equipamentos" ON equipamentos;
CREATE POLICY "anon_insert_equipamentos" ON equipamentos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_equipamentos" ON equipamentos;
CREATE POLICY "anon_update_equipamentos" ON equipamentos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_equipamentos" ON equipamentos;
CREATE POLICY "anon_delete_equipamentos" ON equipamentos FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- LOCACOES (Contratos de Lote)
-- ============================================

CREATE TABLE IF NOT EXISTS locacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato text NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  equipamento_id uuid REFERENCES equipamentos(id) ON DELETE SET NULL,
  valor_aluguel_base numeric(12,2) DEFAULT 0,
  valor_frete_logistico numeric(12,2) DEFAULT 0,
  dias_vigencia int DEFAULT 30,
  data_inicio date DEFAULT CURRENT_DATE,
  data_fim date,
  status status_locacao_enum DEFAULT 'Ativo',
  status_expedicao status_expedicao_enum DEFAULT 'Aguardando',
  regiao_entrega text,
  checklist_saida_ok boolean DEFAULT false,
  checklist_saida_obs text,
  motorista_entrega text,
  data_recebimento_obra timestamptz,
  data_solicitacao_retirada timestamptz,
  motorista_coleta text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_locacoes" ON locacoes;
CREATE POLICY "anon_select_locacoes" ON locacoes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_locacoes" ON locacoes;
CREATE POLICY "anon_insert_locacoes" ON locacoes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_locacoes" ON locacoes;
CREATE POLICY "anon_update_locacoes" ON locacoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_locacoes" ON locacoes;
CREATE POLICY "anon_delete_locacoes" ON locacoes FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- ESTOQUE PECAS
-- ============================================

CREATE TABLE IF NOT EXISTS estoque_pecas (
  sku text PRIMARY KEY,
  nome text NOT NULL,
  marca text,
  estoque_atual int DEFAULT 0,
  estoque_minimo int DEFAULT 0,
  preco_custo numeric(12,2) DEFAULT 0,
  preco_venda numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE estoque_pecas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pecas" ON estoque_pecas;
CREATE POLICY "anon_select_pecas" ON estoque_pecas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pecas" ON estoque_pecas;
CREATE POLICY "anon_insert_pecas" ON estoque_pecas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pecas" ON estoque_pecas;
CREATE POLICY "anon_update_pecas" ON estoque_pecas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pecas" ON estoque_pecas;
CREATE POLICY "anon_delete_pecas" ON estoque_pecas FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- ORDENS OFICINA
-- ============================================

CREATE TABLE IF NOT EXISTS ordens_oficina (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid REFERENCES equipamentos(id) ON DELETE SET NULL,
  locacao_id uuid REFERENCES locacoes(id) ON DELETE SET NULL,
  descricao_problema text,
  status status_os_enum DEFAULT 'Aberta',
  valor_pecas numeric(12,2) DEFAULT 0,
  valor_mao_de_obra numeric(12,2) DEFAULT 0,
  revisao_pos_locacao boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ordens_oficina ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_os" ON ordens_oficina;
CREATE POLICY "anon_select_os" ON ordens_oficina FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_os" ON ordens_oficina;
CREATE POLICY "anon_insert_os" ON ordens_oficina FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_os" ON ordens_oficina;
CREATE POLICY "anon_update_os" ON ordens_oficina FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_os" ON ordens_oficina;
CREATE POLICY "anon_delete_os" ON ordens_oficina FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- CAIXA TRANSACOES
-- ============================================

CREATE TABLE IF NOT EXISTS caixa_transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id text,
  numero_contrato text,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  valor_aluguel_base numeric(12,2) DEFAULT 0,
  valor_frete_total numeric(12,2) DEFAULT 0,
  valor_pecas_oficina numeric(12,2) DEFAULT 0,
  valor_total_consolidado numeric(12,2) DEFAULT 0,
  forma_pagamento forma_pagamento_enum DEFAULT 'Boleto',
  status status_caixa_enum DEFAULT 'Pendente',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE caixa_transacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_caixa" ON caixa_transacoes;
CREATE POLICY "anon_select_caixa" ON caixa_transacoes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_caixa" ON caixa_transacoes;
CREATE POLICY "anon_insert_caixa" ON caixa_transacoes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_caixa" ON caixa_transacoes;
CREATE POLICY "anon_update_caixa" ON caixa_transacoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_caixa" ON caixa_transacoes;
CREATE POLICY "anon_delete_caixa" ON caixa_transacoes FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- CONFIGURACAO VITRINES CLIMATICAS
-- ============================================

CREATE TABLE IF NOT EXISTS configuracao_vitrines_climaticas (
  tipo_clima tipo_clima_enum PRIMARY KEY,
  lista_equipamentos_sugeridos jsonb DEFAULT '[]'::jsonb,
  desconto_porcentagem numeric(5,2) DEFAULT 0,
  mensagem_customizada_bot text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE configuracao_vitrines_climaticas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_vitrines" ON configuracao_vitrines_climaticas;
CREATE POLICY "anon_select_vitrines" ON configuracao_vitrines_climaticas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vitrines" ON configuracao_vitrines_climaticas;
CREATE POLICY "anon_insert_vitrines" ON configuracao_vitrines_climaticas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vitrines" ON configuracao_vitrines_climaticas;
CREATE POLICY "anon_update_vitrines" ON configuracao_vitrines_climaticas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vitrines" ON configuracao_vitrines_climaticas;
CREATE POLICY "anon_delete_vitrines" ON configuracao_vitrines_climaticas FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_locacoes_cliente ON locacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_locacoes_equipamento ON locacoes(equipamento_id);
CREATE INDEX IF NOT EXISTS idx_locacoes_contrato ON locacoes(numero_contrato);
CREATE INDEX IF NOT EXISTS idx_equipamentos_status ON equipamentos(status_atual);
CREATE INDEX IF NOT EXISTS idx_os_equipamento ON ordens_oficina(equipamento_id);
CREATE INDEX IF NOT EXISTS idx_caixa_contrato ON caixa_transacoes(numero_contrato);
