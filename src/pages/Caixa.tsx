import { useState, useEffect, useMemo } from 'react';
import { DollarSign, FileText, MessageSquare, CheckCircle, Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge, PageHeader, EmptyState, LoadingSpinner, StatCard } from '@/components/ui';
import { formatCurrency, formatDateTime, whatsappLink } from '@/lib/utils';
import type { CaixaTransacao, Cliente, Locacao } from '@/types/database';

export default function Caixa() {
  const [loading, setLoading] = useState(true);
  const [transacoes, setTransacoes] = useState<CaixaTransacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [c, cl, l] = await Promise.all([
      supabase.from('caixa_transacoes').select('*, cliente:clientes(*)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('*'),
      supabase.from('locacoes').select('*'),
    ]);
    setTransacoes(c.data || []);
    setClientes(cl.data || []);
    setLocacoes(l.data || []);
    setLoading(false);
  }

  async function consolidarContrato(loc: Locacao) {
    const cliente = clientes.find((c) => c.id === loc.cliente_id);
    const valorAluguel = Number(loc.valor_aluguel_base) * loc.dias_vigencia;
    const valorFrete = Number(loc.valor_frete_logistico);
    const { data: osRelacionadas } = await supabase
      .from('ordens_oficina')
      .select('valor_pecas')
      .eq('locacao_id', loc.id);
    const valorPecas = (osRelacionadas || []).reduce((sum, o) => sum + Number(o.valor_pecas), 0);
    const valorTotal = valorAluguel + valorFrete + valorPecas;
    const existente = transacoes.find((t) => t.numero_contrato === loc.numero_contrato);
    if (existente) {
      await supabase
        .from('caixa_transacoes')
        .update({
          valor_aluguel_base: valorAluguel,
          valor_frete_total: valorFrete,
          valor_pecas_oficina: valorPecas,
          valor_total_consolidado: valorTotal,
        })
        .eq('id', existente.id);
    } else {
      await supabase.from('caixa_transacoes').insert({
        numero_contrato: loc.numero_contrato,
        cliente_id: loc.cliente_id,
        valor_aluguel_base: valorAluguel,
        valor_frete_total: valorFrete,
        valor_pecas_oficina: valorPecas,
        valor_total_consolidado: valorTotal,
        forma_pagamento: 'Boleto',
        status: 'Pendente',
      });
    }
    loadData();
  }

  async function handleEnviarBoleto(t: CaixaTransacao) {
    const cliente = clientes.find((c) => c.id === t.cliente_id);
    if (cliente?.whatsapp) {
      const msg = `Olá ${cliente.nome_razao_social}, segue o boleto da locação ${t.numero_contrato}. Valor: ${formatCurrency(t.valor_total_consolidado)}.`;
      window.open(whatsappLink(cliente.whatsapp, msg), '_blank');
    }
  }

  async function handleEnviarPix(t: CaixaTransacao) {
    const cliente = clientes.find((c) => c.id === t.cliente_id);
    if (cliente?.whatsapp) {
      const msg = `Olá ${cliente.nome_razao_social}, segue o QR Code Pix para pagamento da locação ${t.numero_contrato}. Valor: ${formatCurrency(t.valor_total_consolidado)}.`;
      window.open(whatsappLink(cliente.whatsapp, msg), '_blank');
    }
  }

  async function handleConfirmarPagamento(t: CaixaTransacao) {
    await supabase.from('caixa_transacoes').update({ status: 'Pago' }).eq('id', t.id);
    setTransacoes((prev) => prev.map((tx) => (tx.id === t.id ? { ...tx, status: 'Pago' } : tx)));
  }

  const stats = useMemo(() => {
    const total = transacoes.reduce((s, t) => s + Number(t.valor_total_consolidado), 0);
    const pago = transacoes.filter((t) => t.status === 'Pago').reduce((s, t) => s + Number(t.valor_total_consolidado), 0);
    const pendente = transacoes.filter((t) => t.status === 'Pendente').reduce((s, t) => s + Number(t.valor_total_consolidado), 0);
    return { total, pago, pendente };
  }, [transacoes]);

  const contratosSemCaixa = locacoes.filter(
    (l) => l.status === 'Ativo' && !transacoes.some((t) => t.numero_contrato === l.numero_contrato)
  );
  const contratosUnicos = [...new Set(contratosSemCaixa.map((l) => l.numero_contrato))];

  if (loading) return <LoadingSpinner message="Carregando caixa..." />;

  return (
    <div>
      <PageHeader title="Caixa" subtitle="Consolidação financeira de contratos" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Consolidado" value={formatCurrency(stats.total)} icon={<DollarSign size={22} />} color="blue" />
        <StatCard label="Recebido" value={formatCurrency(stats.pago)} icon={<CheckCircle size={22} />} color="emerald" />
        <StatCard label="Pendente" value={formatCurrency(stats.pendente)} icon={<FileText size={22} />} color="amber" />
      </div>

      {contratosUnicos.length > 0 && (
        <Card className="mb-4 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Contratos sem consolidação no caixa</p>
          <div className="flex flex-wrap gap-2">
            {contratosUnicos.map((numero) => {
              const loc = contratosSemCaixa.find((l) => l.numero_contrato === numero)!;
              return (
                <Button
                  key={numero}
                  size="sm"
                  variant="secondary"
                  onClick={() => consolidarContrato(loc)}
                >
                  <span className="flex items-center gap-1.5">
                    <Receipt size={14} /> {numero}
                  </span>
                </Button>
              );
            })}
          </div>
        </Card>
      )}

      {transacoes.length === 0 ? (
        <EmptyState message="Nenhuma transação no caixa" icon={<DollarSign size={32} />} />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Contrato</th>
                <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                <th className="px-4 py-3 text-right font-semibold">Aluguel</th>
                <th className="px-4 py-3 text-right font-semibold">Frete</th>
                <th className="px-4 py-3 text-right font-semibold">Peças</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transacoes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800 font-medium">{t.numero_contrato}</td>
                  <td className="px-4 py-3 text-slate-600">{t.cliente?.nome_razao_social || '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.valor_aluguel_base)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.valor_frete_total)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.valor_pecas_oficina)}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-bold">{formatCurrency(t.valor_total_consolidado)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={t.status}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {t.status === 'Pendente' && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => handleEnviarBoleto(t)}>
                            Boleto
                          </Button>
                          <Button size="sm" variant="success" onClick={() => handleEnviarPix(t)}>
                            <span className="flex items-center gap-1">
                              <MessageSquare size={12} /> Pix
                            </span>
                          </Button>
                          <Button size="sm" onClick={() => handleConfirmarPagamento(t)}>
                            Pago
                          </Button>
                        </>
                      )}
                      {t.status === 'Pago' && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={14} /> {formatDateTime(t.created_at)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
