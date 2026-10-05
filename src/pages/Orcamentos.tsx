import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Plus, Trash2, FileDown, Search, Inbox, MessageSquare, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge, PageHeader, EmptyState, LoadingSpinner, Select, Input } from '@/components/ui';
import { formatCurrency, formatDateTime, cn, whatsappLink } from '@/lib/utils';
import type { Cliente, Equipamento, OrcamentoRecebido } from '@/types/database';

interface ItemOrcamento {
  equipamento_id: string;
  nome: string;
  patrimonio: string;
  valor_diaria: number;
  dias: number;
}

export default function Orcamentos() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'proposta' | 'recebidos'>('proposta');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [recebidos, setRecebidos] = useState<OrcamentoRecebido[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [showSeletor, setShowSeletor] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState('');
  const [diasGeral, setDiasGeral] = useState('30');
  const [whatsappInput, setWhatsappInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [c, e, r] = await Promise.all([
      supabase.from('clientes').select('*').order('nome_razao_social'),
      supabase.from('equipamentos').select('*').order('nome_modelo'),
      supabase.from('orcamentos_recebidos').select('*').order('created_at', { ascending: false }),
    ]);
    setClientes(c.data || []);
    setEquipamentos(e.data || []);
    setRecebidos(r.data || []);
    setLoading(false);
  }

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes;
    const q = buscaCliente.toLowerCase();
    return clientes.filter(
      (c) => c.nome_razao_social.toLowerCase().includes(q) || (c.cnpj || '').includes(q)
    );
  }, [clientes, buscaCliente]);

  const equipamentosDisponiveis = equipamentos.filter(
    (e) => e.status_atual === 'Disponivel' && !itens.some((i) => i.equipamento_id === e.id)
  );

  function addEquipamento() {
    const eq = equipamentos.find((e) => e.id === equipamentoSelecionado);
    if (!eq) return;
    setItens((prev) => [
      ...prev,
      {
        equipamento_id: eq.id,
        nome: eq.nome_modelo,
        patrimonio: eq.codigo_patrimonio,
        valor_diaria: 0,
        dias: parseInt(diasGeral) || 30,
      },
    ]);
    setEquipamentoSelecionado('');
    setShowSeletor(false);
  }

  function updateItem(idx: number, field: keyof ItemOrcamento, value: string | number) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = useMemo(() => {
    return itens.reduce((s, i) => s + i.valor_diaria * i.dias, 0);
  }, [itens]);

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);

  function exportarPDF() {
    if (!clienteSelecionado || itens.length === 0) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const hoje = new Date().toLocaleDateString('pt-BR');
    const itensHTML = itens
      .map(
        (i) => `
        <tr>
          <td>${i.nome}</td>
          <td>${i.patrimonio}</td>
          <td style="text-align:right">${formatCurrency(i.valor_diaria)}</td>
          <td style="text-align:center">${i.dias}</td>
          <td style="text-align:right">${formatCurrency(i.valor_diaria * i.dias)}</td>
        </tr>`
      )
      .join('');
    win.document.write(`
      <html>
      <head>
        <title>Proposta Comercial - ${clienteSelecionado.nome_razao_social}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 22px; font-weight: bold; color: #0f172a; }
          .info { text-align: right; font-size: 12px; color: #64748b; }
          h1 { font-size: 18px; }
          .cliente-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #0f172a; color: white; padding: 10px; font-size: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .total { text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 20px; }
          .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">AlfaSys Locação</div>
          <div class="info">Proposta emitida em ${hoje}<br/>Proposta Nº ${Date.now().toString().slice(-6)}</div>
        </div>
        <h1>Proposta Comercial</h1>
        <div class="cliente-info">
          <strong>Cliente:</strong> ${clienteSelecionado.nome_razao_social}<br/>
          <strong>CNPJ:</strong> ${clienteSelecionado.cnpj || '-'}<br/>
          <strong>Email:</strong> ${clienteSelecionado.email || '-'}
        </div>
        <table>
          <thead>
            <tr>
              <th>Equipamento</th>
              <th>Patrimônio</th>
              <th style="text-align:right">Diária</th>
              <th style="text-align:center">Dias</th>
              <th style="text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itensHTML}</tbody>
        </table>
        <div class="total">Total: ${formatCurrency(total)}</div>
        <div class="footer">
          AlfaSys ERP Locação - Proposta válida por 15 dias.<br/>
          Valores sujeitos a confirmação de disponibilidade dos equipamentos.
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  async function receberPedidoWhatsApp() {
    if (!whatsappInput.trim()) return;
    const cliente = clientes.find(
      (c) => whatsappInput.includes(c.nome_razao_social) || (c.whatsapp && whatsappInput.includes(c.whatsapp))
    );
    const equipSugeridos = equipamentos
      .filter((e) => whatsappInput.toLowerCase().includes(e.nome_modelo.toLowerCase()))
      .map((e) => e.nome_modelo);

    await supabase.from('orcamentos_recebidos').insert({
      cliente_nome: cliente?.nome_razao_social || 'Cliente não identificado',
      cliente_whatsapp: cliente?.whatsapp || null,
      mensagem_original: whatsappInput,
      equipamentos_sugeridos: equipSugeridos,
      status: 'Novo',
    });

    setWhatsappInput('');
    loadData();
  }

  async function marcarRecebido(r: OrcamentoRecebido, status: 'Convertido' | 'Ignorado') {
    await supabase.from('orcamentos_recebidos').update({ status }).eq('id', r.id);
    setRecebidos((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)));
  }

  async function responderRecebido(r: OrcamentoRecebido) {
    if (!r.cliente_whatsapp) return;
    const msg = `Olá ${r.cliente_nome}, recebemos seu pedido de orçamento para: ${(r.equipamentos_sugeridos || []).join(', ')}. Já estamos preparando sua proposta.`;
    window.open(whatsappLink(r.cliente_whatsapp, msg), '_blank');
  }

  if (loading) return <LoadingSpinner message="Carregando orçamentos..." />;

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Propostas comerciais e pedidos recebidos"
        action={
          tab === 'proposta' ? (
            <Button onClick={exportarPDF} disabled={!clienteId || itens.length === 0}>
              <span className="flex items-center gap-1.5"><FileDown size={16} /> Exportar PDF</span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setTab('proposta')}
          className={cn('px-3.5 py-1.5 text-sm font-medium rounded-md', tab === 'proposta' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
        >
          <span className="flex items-center gap-1.5"><ClipboardList size={15} /> Proposta</span>
        </button>
        <button
          onClick={() => setTab('recebidos')}
          className={cn('px-3.5 py-1.5 text-sm font-medium rounded-md', tab === 'recebidos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
        >
          <span className="flex items-center gap-1.5">
            <Inbox size={15} /> Recebidos
            {recebidos.filter((r) => r.status === 'Novo').length > 0 && (
              <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {recebidos.filter((r) => r.status === 'Novo').length}
              </span>
            )}
          </span>
        </button>
      </div>

      {tab === 'proposta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4 lg:col-span-1">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Dados do Cliente</h3>
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                {clientesFiltrados.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum cliente</p>
                ) : (
                  clientesFiltrados.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setClienteId(c.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm border-b border-slate-100 hover:bg-slate-50',
                        clienteId === c.id ? 'bg-slate-900/5 font-medium' : 'text-slate-700'
                      )}
                    >
                      {c.nome_razao_social}
                      <span className="text-xs text-slate-400 block">{c.cnpj}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Itens da Proposta</h3>
              <div className="flex items-center gap-2">
                <Input label="" type="number" value={diasGeral} onChange={setDiasGeral} placeholder="Dias" className="w-24" />
                <Button size="sm" onClick={() => setShowSeletor(!showSeletor)}>
                  <span className="flex items-center gap-1"><Plus size={14} /> Máquina</span>
                </Button>
              </div>
            </div>

            {showSeletor && (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                <Select
                  value={equipamentoSelecionado}
                  onChange={setEquipamentoSelecionado}
                  options={equipamentosDisponiveis.map((e) => ({
                    value: e.id,
                    label: `${e.nome_modelo} (${e.codigo_patrimonio})`,
                  }))}
                />
                <Button size="sm" className="mt-2" onClick={addEquipamento} disabled={!equipamentoSelecionado}>
                  Adicionar
                </Button>
              </div>
            )}

            {itens.length === 0 ? (
              <EmptyState message="Adicione máquinas para montar a proposta" icon={<ClipboardList size={28} />} />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Equipamento</th>
                    <th className="px-2 py-2 text-right">Diária</th>
                    <th className="px-2 py-2 text-center">Dias</th>
                    <th className="px-2 py-2 text-right">Subtotal</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2">
                        <p className="font-medium text-slate-800 text-sm">{item.nome}</p>
                        <p className="text-xs text-slate-400">{item.patrimonio}</p>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          value={item.valor_diaria}
                          onChange={(e) => updateItem(idx, 'valor_diaria', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 text-right text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          value={item.dias}
                          onChange={(e) => updateItem(idx, 'dias', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-center text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-slate-700">
                        {formatCurrency(item.valor_diaria * item.dias)}
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {itens.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200 text-right">
                <p className="text-lg font-bold text-slate-900">{formatCurrency(total)}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'recebidos' && (
        <div className="space-y-4 max-w-3xl">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Receber Pedido via WhatsApp</h3>
            <textarea
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              placeholder="Cole aqui a mensagem do cliente pedindo orçamento..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
            <Button className="mt-3" onClick={receberPedidoWhatsApp} disabled={!whatsappInput.trim()}>
              <span className="flex items-center gap-1.5"><MessageSquare size={14} /> Registrar Pedido</span>
            </Button>
          </Card>

          {recebidos.length === 0 ? (
            <Card className="p-5">
              <EmptyState message="Nenhum orçamento recebido ainda" icon={<Inbox size={32} />} />
            </Card>
          ) : (
            <div className="space-y-3">
              {recebidos.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 text-sm">{r.cliente_nome}</h4>
                        <Badge status={r.status === 'Novo' ? 'Aberta' : r.status === 'Convertido' ? 'Pago' : 'Encerrado'}>
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(r.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 mb-2">{r.mensagem_original}</p>
                  {r.equipamentos_sugeridos?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {r.equipamentos_sugeridos.map((eq, i) => (
                        <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{eq}</span>
                      ))}
                    </div>
                  )}
                  {r.status === 'Novo' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => marcarRecebido(r, 'Convertido')}>
                        <span className="flex items-center gap-1"><Check size={12} /> Converter</span>
                      </Button>
                      {r.cliente_whatsapp && (
                        <Button size="sm" variant="secondary" onClick={() => responderRecebido(r)}>
                          <span className="flex items-center gap-1"><MessageSquare size={12} /> Responder</span>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => marcarRecebido(r, 'Ignorado')}>
                        Ignorar
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
