import { useState, useEffect } from 'react';
import { Plus, FileText, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Modal, Input, Select, Badge, PageHeader, EmptyState, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Cliente, Equipamento, Locacao } from '@/types/database';

export default function Contratos() {
  const [loading, setLoading] = useState(true);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEquipamentos, setSelectedEquipamentos] = useState<string[]>([]);
  const [form, setForm] = useState({
    cliente_id: '',
    valor_aluguel_base: '',
    valor_frete_logistico: '',
    dias_vigencia: '30',
    regiao_entrega: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [l, c, e] = await Promise.all([
      supabase.from('locacoes').select('*, cliente:clientes(*), equipamento:equipamentos(*)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('*').order('nome_razao_social'),
      supabase.from('equipamentos').select('*').order('nome_modelo'),
    ]);
    setLocacoes(l.data || []);
    setClientes(c.data || []);
    setEquipamentos(e.data || []);
    setLoading(false);
  }

  const contratosAgrupados = locacoes.reduce((acc, l) => {
    if (!acc[l.numero_contrato]) acc[l.numero_contrato] = [];
    acc[l.numero_contrato].push(l);
    return acc;
  }, {} as Record<string, Locacao[]>);

  const contratosAtrasados = Object.values(contratosAgrupados).filter((group) =>
    group.some((l) => l.status === 'Atrasado')
  );

  async function handleCreate() {
    if (!form.cliente_id || selectedEquipamentos.length === 0) return;
    const numeroContrato = `CT-${Date.now().toString().slice(-6)}`;
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + parseInt(form.dias_vigencia || '30'));

    const inserts = selectedEquipamentos.map((eqId) => ({
      numero_contrato: numeroContrato,
      cliente_id: form.cliente_id,
      equipamento_id: eqId,
      valor_aluguel_base: parseFloat(form.valor_aluguel_base) || 0,
      valor_frete_logistico: parseFloat(form.valor_frete_logistico) || 0,
      dias_vigencia: parseInt(form.dias_vigencia) || 30,
      data_fim: dataFim.toISOString().split('T')[0],
      status: 'Ativo' as const,
      status_expedicao: 'Aguardando' as const,
      regiao_entrega: form.regiao_entrega || null,
    }));

    const { data } = await supabase.from('locacoes').insert(inserts).select('*, cliente:clientes(*), equipamento:equipamentos(*)');
    if (data) {
      setLocacoes((prev) => [...data, ...prev]);
      for (const eqId of selectedEquipamentos) {
        await supabase.from('equipamentos').update({ status_atual: 'Alugado' }).eq('id', eqId);
      }
    }

    setShowModal(false);
    setSelectedEquipamentos([]);
    setForm({ cliente_id: '', valor_aluguel_base: '', valor_frete_logistico: '', dias_vigencia: '30', regiao_entrega: '' });
    loadData();
  }

  function toggleEquipamento(id: string) {
    setSelectedEquipamentos((prev) =>
      prev.includes(id) ? prev.filter((eq) => eq !== id) : [...prev, id]
    );
  }

  if (loading) return <LoadingSpinner message="Carregando contratos..." />;

  const equipamentosDisponiveis = equipamentos.filter((e) => e.status_atual === 'Disponivel');

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle={`${Object.keys(contratosAgrupados).length} contratos`}
        action={
          <Button onClick={() => setShowModal(true)}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Novo Contrato
            </span>
          </Button>
        }
      />

      {contratosAtrasados.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">
              {contratosAtrasados.length} contrato(s) com atraso
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {contratosAtrasados.map((g) => g[0].numero_contrato).join(', ')}
            </p>
          </div>
        </div>
      )}

      {Object.keys(contratosAgrupados).length === 0 ? (
        <EmptyState message="Nenhum contrato criado ainda" icon={<FileText size={32} />} />
      ) : (
        <div className="space-y-4">
          {Object.entries(contratosAgrupados).map(([numero, group]) => {
            const primeiro = group[0];
            const atrasado = group.some((l) => l.status === 'Atrasado');
            return (
              <Card key={numero} className={cn('p-5', atrasado && 'border-red-300')}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{numero}</h3>
                      <Badge status={primeiro.status}>{primeiro.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{primeiro.cliente?.nome_razao_social || 'Sem cliente'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Valor base/diária</p>
                    <p className="font-bold text-slate-800">{formatCurrency(primeiro.valor_aluguel_base)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-xs text-slate-400">Equipamentos</p>
                    <p className="text-slate-700 font-medium">{group.length} máquina(s)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Vigência</p>
                    <p className="text-slate-700 font-medium">{primeiro.dias_vigencia} dias</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} /> Término</p>
                    <p className={cn('font-medium', atrasado ? 'text-red-600' : 'text-slate-700')}>{formatDate(primeiro.data_fim)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Região</p>
                    <p className="text-slate-700 font-medium">{primeiro.regiao_entrega || '-'}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-400 mb-2">Máquinas no lote:</p>
                  <div className="flex flex-wrap gap-2">
                    {group.map((l) => (
                      <span key={l.id} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                        {l.equipamento?.nome_modelo} ({l.equipamento?.codigo_patrimonio})
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Contrato de Lote" size="lg">
        <div className="space-y-4">
          <Select
            label="Cliente"
            value={form.cliente_id}
            onChange={(v) => setForm({ ...form, cliente_id: v })}
            options={clientes.map((c) => ({ value: c.id, label: c.nome_razao_social }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor Aluguel Base (R$)"
              type="number"
              value={form.valor_aluguel_base}
              onChange={(v) => setForm({ ...form, valor_aluguel_base: v })}
            />
            <Input
              label="Valor Frete (R$)"
              type="number"
              value={form.valor_frete_logistico}
              onChange={(v) => setForm({ ...form, valor_frete_logistico: v })}
            />
            <Input
              label="Dias de Vigência"
              type="number"
              value={form.dias_vigencia}
              onChange={(v) => setForm({ ...form, dias_vigencia: v })}
            />
            <Input
              label="Região de Entrega"
              value={form.regiao_entrega}
              onChange={(v) => setForm({ ...form, regiao_entrega: v })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Selecione as máquinas ({selectedEquipamentos.length} selecionada(s))
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {equipamentosDisponiveis.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nenhuma máquina disponível</p>
              ) : (
                equipamentosDisponiveis.map((eq) => (
                  <label
                    key={eq.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm',
                      selectedEquipamentos.includes(eq.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEquipamentos.includes(eq.id)}
                      onChange={() => toggleEquipamento(eq.id)}
                      className="rounded"
                    />
                    <span className="font-medium">{eq.nome_modelo}</span>
                    <span className="text-xs text-slate-400">({eq.codigo_patrimonio})</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!form.cliente_id || selectedEquipamentos.length === 0}>
              Criar Contrato
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
