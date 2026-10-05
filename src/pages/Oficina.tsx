import { useState, useEffect } from 'react';
import { Wrench, Plus, CheckCircle, DollarSign, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge, PageHeader, EmptyState, LoadingSpinner, Modal, Input, Textarea, Select } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OrdemOficina, Equipamento, EstoquePeca, Locacao } from '@/types/database';

export default function Oficina() {
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<OrdemOficina[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [pecas, setPecas] = useState<EstoquePeca[]>([]);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [baixaModal, setBaixaModal] = useState<OrdemOficina | null>(null);
  const [liberarModal, setLiberarModal] = useState<OrdemOficina | null>(null);
  const [form, setForm] = useState({
    equipamento_id: '',
    descricao_problema: '',
    valor_mao_de_obra: '',
    revisao_pos_locacao: false,
  });
  const [pecasSelecionadas, setPecasSelecionadas] = useState<{ sku: string; quantidade: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [o, e, p, l] = await Promise.all([
      supabase.from('ordens_oficina').select('*, equipamento:equipamentos(*), locacao:locacoes(*)').order('created_at', { ascending: false }),
      supabase.from('equipamentos').select('*'),
      supabase.from('estoque_pecas').select('*'),
      supabase.from('locacoes').select('*'),
    ]);
    setOrdens(o.data || []);
    setEquipamentos(e.data || []);
    setPecas(p.data || []);
    setLocacoes(l.data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.equipamento_id) return;
    const { data } = await supabase
      .from('ordens_oficina')
      .insert({
        equipamento_id: form.equipamento_id,
        descricao_problema: form.descricao_problema,
        valor_mao_de_obra: parseFloat(form.valor_mao_de_obra) || 0,
        valor_pecas: 0,
        status: 'Aberta',
        revisao_pos_locacao: form.revisao_pos_locacao,
      })
      .select('*, equipamento:equipamentos(*), locacao:locacoes(*)')
      .single();
    if (data) setOrdens((prev) => [data, ...prev]);
    await supabase.from('equipamentos').update({ status_atual: 'Oficina' }).eq('id', form.equipamento_id);
    setShowModal(false);
    setForm({ equipamento_id: '', descricao_problema: '', valor_mao_de_obra: '', revisao_pos_locacao: false });
    loadData();
  }

  async function handleIniciarOS(os: OrdemOficina) {
    await supabase.from('ordens_oficina').update({ status: 'Em Andamento' }).eq('id', os.id);
    setOrdens((prev) => prev.map((o) => (o.id === os.id ? { ...o, status: 'Em Andamento' } : o)));
  }

  async function handleLiberar() {
    if (!liberarModal) return;
    await supabase.from('ordens_oficina').update({ status: 'Concluida' }).eq('id', liberarModal.id);
    if (liberarModal.equipamento_id) {
      await supabase.from('equipamentos').update({ status_atual: 'Disponivel' }).eq('id', liberarModal.equipamento_id);
    }
    setLiberarModal(null);
    loadData();
  }

  function addPeca() {
    setPecasSelecionadas((prev) => [...prev, { sku: '', quantidade: '1' }]);
  }

  async function handleBaixaPecas() {
    if (!baixaModal) return;
    let valorTotalPecas = 0;
    for (const ps of pecasSelecionadas) {
      if (!ps.sku) continue;
      const peca = pecas.find((p) => p.sku === ps.sku);
      if (!peca) continue;
      const qtd = parseInt(ps.quantidade) || 0;
      if (qtd > peca.estoque_atual) {
        alert(`Estoque insuficiente para ${peca.nome}`);
        return;
      }
      valorTotalPecas += peca.preco_venda * qtd;
      await supabase.from('estoque_pecas').update({ estoque_atual: peca.estoque_atual - qtd }).eq('sku', ps.sku);
    }
    await supabase
      .from('ordens_oficina')
      .update({ valor_pecas: valorTotalPecas, status: 'Concluida' })
      .eq('id', baixaModal.id);

    if (baixaModal.locacao_id && baixaModal.locacao) {
      const caixaExistente = await supabase
        .from('caixa_transacoes')
        .select('*')
        .eq('numero_contrato', baixaModal.locacao.numero_contrato)
        .maybeSingle();
      if (caixaExistente.data) {
        const novoValorPecas = Number(caixaExistente.data.valor_pecas_oficina) + valorTotalPecas;
        const novoTotal =
          Number(caixaExistente.data.valor_aluguel_base) +
          Number(caixaExistente.data.valor_frete_total) +
          novoValorPecas;
        await supabase
          .from('caixa_transacoes')
          .update({ valor_pecas_oficina: novoValorPecas, valor_total_consolidado: novoTotal })
          .eq('id', caixaExistente.data.id);
      }
    }

    if (baixaModal.equipamento_id) {
      await supabase.from('equipamentos').update({ status_atual: 'Disponivel' }).eq('id', baixaModal.equipamento_id);
    }

    setBaixaModal(null);
    setPecasSelecionadas([]);
    loadData();
  }

  if (loading) return <LoadingSpinner message="Carregando ordens de oficina..." />;

  return (
    <div>
      <PageHeader
        title="Oficina"
        subtitle={`${ordens.filter((o) => o.status !== 'Concluida').length} OS em andamento`}
        action={
          <Button onClick={() => setShowModal(true)}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Nova OS
            </span>
          </Button>
        }
      />

      {ordens.length === 0 ? (
        <EmptyState message="Nenhuma ordem de serviço aberta" icon={<Wrench size={32} />} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ordens.map((os) => (
            <Card key={os.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 text-sm">OS #{os.id.slice(0, 8)}</h3>
                    <Badge status={os.status}>{os.status}</Badge>
                    {os.revisao_pos_locacao && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Revisão Pós-Locação</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{os.equipamento?.nome_modelo}</p>
                  <p className="text-xs text-slate-400">{os.equipamento?.codigo_patrimonio}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">{os.descricao_problema || 'Sem descrição'}</p>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="text-xs text-slate-400">Peças</p>
                  <p className="font-medium text-slate-700">{formatCurrency(os.valor_pecas)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Mão de Obra</p>
                  <p className="font-medium text-slate-700">{formatCurrency(os.valor_mao_de_obra)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3">Aberta em: {formatDate(os.created_at)}</p>
              <div className="flex gap-2">
                {os.status === 'Aberta' && (
                  <Button size="sm" onClick={() => handleIniciarOS(os)}>
                    Iniciar
                  </Button>
                )}
                {os.status === 'Em Andamento' && (
                  <>
                    <Button size="sm" variant="success" onClick={() => setLiberarModal(os)}>
                      <span className="flex items-center gap-1">
                        <CheckCircle size={14} /> Liberar
                      </span>
                    </Button>
                    <Button size="sm" variant="warning" onClick={() => { setBaixaModal(os); setPecasSelecionadas([{ sku: '', quantidade: '1' }]); }}>
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} /> Cobrar Peças
                      </span>
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Ordem de Serviço">
        <div className="space-y-4">
          <Select
            label="Equipamento"
            value={form.equipamento_id}
            onChange={(v) => setForm({ ...form, equipamento_id: v })}
            options={equipamentos.map((e) => ({ value: e.id, label: `${e.nome_modelo} (${e.codigo_patrimonio})` }))}
            required
          />
          <Textarea
            label="Descrição do Problema"
            value={form.descricao_problema}
            onChange={(v) => setForm({ ...form, descricao_problema: v })}
            placeholder="Descreva o problema ou motivo da revisão..."
          />
          <Input
            label="Valor Mão de Obra (R$)"
            type="number"
            value={form.valor_mao_de_obra}
            onChange={(v) => setForm({ ...form, valor_mao_de_obra: v })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.revisao_pos_locacao}
              onChange={(e) => setForm({ ...form, revisao_pos_locacao: e.target.checked })}
              className="rounded"
            />
            Revisão pós-locação
          </label>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd}>Criar OS</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!liberarModal} onClose={() => setLiberarModal(null)} title="Liberar Equipamento">
        <div className="space-y-4">
          <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-700">
            <p>O equipamento <strong>{liberarModal?.equipamento?.nome_modelo}</strong> voltará para "Disponível".</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setLiberarModal(null)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleLiberar}>
              Confirmar Liberação
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!baixaModal} onClose={() => setBaixaModal(null)} title="Baixa de Peças e Fechamento" size="lg">
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
            <p className="flex items-center gap-2">
              <Package size={16} />
              Selecione as peças usadas. O valor será dado baixa no estoque pelo preço de venda e injetado na fatura do contrato.
            </p>
          </div>
          <div className="space-y-2">
            {pecasSelecionadas.map((ps, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <Select
                  label={idx === 0 ? 'Peça' : ''}
                  value={ps.sku}
                  onChange={(v) =>
                    setPecasSelecionadas((prev) => prev.map((p, i) => (i === idx ? { ...p, sku: v } : p)))
                  }
                  options={pecas
                    .filter((p) => p.estoque_atual > 0)
                    .map((p) => ({ value: p.sku, label: `${p.nome} (${p.estoque_atual} em estoque) - ${formatCurrency(p.preco_venda)}` }))}
                  className="flex-1"
                />
                <Input
                  label={idx === 0 ? 'Qtd' : ''}
                  type="number"
                  value={ps.quantidade}
                  onChange={(v) =>
                    setPecasSelecionadas((prev) => prev.map((p, i) => (i === idx ? { ...p, quantidade: v } : p)))
                  }
                  className="w-20"
                />
                {pecasSelecionadas.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPecasSelecionadas((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addPeca}>
              + Adicionar Peça
            </Button>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setBaixaModal(null)}>
              Cancelar
            </Button>
            <Button variant="warning" onClick={handleBaixaPecas}>
              Dar Baixa e Concluir OS
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
