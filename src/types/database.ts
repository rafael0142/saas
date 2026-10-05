export type StatusFinanceiro = 'Adimplente' | 'Inadimplente' | 'Bloqueado';
export type StatusEquipamento = 'Disponivel' | 'Alugado' | 'Oficina';
export type StatusLocacao = 'Ativo' | 'Encerrado' | 'Atrasado';
export type StatusExpedicao = 'Aguardando' | 'Em Transito' | 'Entregue na Obra' | 'Atrasado' | 'Coleta Solicitada' | 'Coletado';
export type StatusOS = 'Aberta' | 'Em Andamento' | 'Concluida';
export type StatusCaixa = 'Pendente' | 'Pago';
export type TipoClima = 'Sol' | 'Chuva' | 'Nublado';
export type FormaPagamento = 'Boleto' | 'Pix' | 'Cartao' | 'Dinheiro';

export interface Categoria {
  id: string;
  nome: string;
  cor_hex: string;
}

export interface Cliente {
  id: string;
  nome_razao_social: string;
  cnpj: string | null;
  email: string | null;
  status_financeiro: StatusFinanceiro;
  imagem_buffer: string | null;
  whatsapp: string | null;
  created_at: string;
}

export interface Equipamento {
  id: string;
  nome_modelo: string;
  codigo_patrimonio: string;
  status_atual: StatusEquipamento;
  categoria_id: string | null;
  imagem_url: string | null;
  categorias?: Categoria | null;
  created_at: string;
}

export interface Locacao {
  id: string;
  numero_contrato: string;
  cliente_id: string | null;
  equipamento_id: string | null;
  valor_aluguel_base: number;
  valor_frete_logistico: number;
  dias_vigencia: number;
  data_inicio: string;
  data_fim: string | null;
  status: StatusLocacao;
  status_expedicao: StatusExpedicao;
  regiao_entrega: string | null;
  checklist_saida_ok: boolean;
  checklist_saida_obs: string | null;
  motorista_entrega: string | null;
  data_recebimento_obra: string | null;
  data_solicitacao_retirada: string | null;
  motorista_coleta: string | null;
  created_at: string;
  cliente?: Cliente | null;
  equipamento?: Equipamento | null;
}

export interface EstoquePeca {
  sku: string;
  nome: string;
  marca: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number;
  preco_venda: number;
  created_at: string;
}

export interface OrdemOficina {
  id: string;
  equipamento_id: string | null;
  locacao_id: string | null;
  descricao_problema: string | null;
  status: StatusOS;
  valor_pecas: number;
  valor_mao_de_obra: number;
  revisao_pos_locacao: boolean;
  created_at: string;
  equipamento?: Equipamento | null;
  locacao?: Locacao | null;
}

export interface CaixaTransacao {
  id: string;
  sessao_id: string | null;
  numero_contrato: string | null;
  cliente_id: string | null;
  valor_aluguel_base: number;
  valor_frete_total: number;
  valor_pecas_oficina: number;
  valor_total_consolidado: number;
  forma_pagamento: FormaPagamento;
  status: StatusCaixa;
  created_at: string;
  cliente?: Cliente | null;
}

export interface ConfiguracaoVitrine {
  tipo_clima: TipoClima;
  lista_equipamentos_sugeridos: string[];
  desconto_porcentagem: number;
  mensagem_customizada_bot: string | null;
  created_at: string;
}

export type UserRole = 'admin' | 'vendas' | 'mecanico' | 'almoxarifado';

export interface UserProfile {
  id: string;
  nome: string;
  role: UserRole;
  created_at: string;
}

export interface OrcamentoRecebido {
  id: string;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  mensagem_original: string | null;
  equipamentos_sugeridos: string[];
  status: 'Novo' | 'Convertido' | 'Ignorado';
  created_at: string;
}

export type Page =
  | 'dashboard'
  | 'clientes'
  | 'equipamentos'
  | 'contratos'
  | 'expedicao'
  | 'oficina'
  | 'estoque'
  | 'caixa'
  | 'orcamentos'
  | 'vendas'
  | 'fiscal'
  | 'usuarios';
