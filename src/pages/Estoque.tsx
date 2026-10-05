import { useState, useEffect } from 'react';
import { Package, Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge, PageHeader, EmptyState, LoadingSpinner, Modal, Input } from '@/components/ui';
import { formatCurrency, cn } from '@/lib/utils';
import type { EstoquePeca } from '@/types/database';

export default function Estoque() {
  const [loading, setLoading] = useState(true);
  const [pecas, setPecas] = useState<EstoquePeca[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    nome: '',
    marca: '',
    estoque_atual: '0',
    estoque_minimo: '0',
    preco_custo: '',
    preco_venda: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from('estoque_pecas').select('*').order('nome');
    setPecas(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.sku || !form.nome) return;
    const { data } = await supabase
      .from('estoque_pecas')
      .insert({
        sku: form.sku,
        nome: form.nome,
        marca: form.marca || null,
        estoque_atual: parseInt(form.estoque_atual) || 0,
        estoque_minimo: parseInt(form.estoque_minimo) || 0,
        preco_custo: parseFloat(form.preco_custo) || 0,
        preco_venda: parseFloat(form.preco_venda) || 0,
      })
      .select('*')
      .single();
    if (data) setPecas((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setShowModal(false);
    setForm({ sku: '', nome: '', marca: '', estoque_atual: '0', estoque_minimo: '0', preco_custo: '', preco_venda: '' });
  }

  async function updateEstoque(peca: EstoquePeca, novoValor: number) {
    await supabase.from('estoque_pecas').update({ estoque_atual: novoValor }).eq('sku', peca.sku);
    setPecas((prev) => prev.map((p) => (p.sku === peca.sku ? { ...p, estoque_atual: novoValor } : p)));
  }

  if (loading) return <LoadingSpinner message="Carregando estoque..." />;

  const pecasBaixas = pecas.filter((p) => p.estoque_atual <= p.estoque_minimo);

  return (
    <div>
      <PageHeader
        title="Estoque de Peças"
        subtitle={`${pecas.length} itens cadastrados`}
        action={
          <Button onClick={() => setShowModal(true)}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Nova Peça
            </span>
          </Button>
        }
      />

      {pecasBaixas.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">{pecasBaixas.length} peça(s) com estoque baixo</p>
            <p className="text-xs text-amber-600 mt-0.5">{pecasBaixas.map((p) => p.nome).join(', ')}</p>
          </div>
        </div>
      )}

      {pecas.length === 0 ? (
        <EmptyState message="Nenhuma peça cadastrada" icon={<Package size={32} />} />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-left font-semibold">Nome</th>
                <th className="px-4 py-3 text-left font-semibold">Marca</th>
                <th className="px-4 py-3 text-center font-semibold">Estoque</th>
                <th className="px-4 py-3 text-center font-semibold">Mínimo</th>
                <th className="px-4 py-3 text-right font-semibold">Custo</th>
                <th className="px-4 py-3 text-right font-semibold">Venda</th>
                <th className="px-4 py-3 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pecas.map((p) => {
                const baixo = p.estoque_atual <= p.estoque_minimo;
                return (
                  <tr key={p.sku} className={cn('hover:bg-slate-50', baixo && 'bg-amber-50/50')}>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{p.nome}</td>
                    <td className="px-4 py-3 text-slate-600">{p.marca || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('font-semibold', baixo ? 'text-amber-600' : 'text-slate-700')}>{p.estoque_atual}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{p.estoque_minimo}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.preco_custo)}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-medium">{formatCurrency(p.preco_venda)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => updateEstoque(p, p.estoque_atual + 1)}>
                          +1
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateEstoque(p, Math.max(0, p.estoque_atual - 1))}
                          disabled={p.estoque_atual === 0}
                        >
                          -1
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Peça">
        <div className="space-y-4">
          <Input label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} required />
          <Input label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
          <Input label="Marca" value={form.marca} onChange={(v) => setForm({ ...form, marca: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Estoque Atual" type="number" value={form.estoque_atual} onChange={(v) => setForm({ ...form, estoque_atual: v })} />
            <Input label="Estoque Mínimo" type="number" value={form.estoque_minimo} onChange={(v) => setForm({ ...form, estoque_minimo: v })} />
            <Input label="Preço Custo (R$)" type="number" value={form.preco_custo} onChange={(v) => setForm({ ...form, preco_custo: v })} />
            <Input label="Preço Venda (R$)" type="number" value={form.preco_venda} onChange={(v) => setForm({ ...form, preco_venda: v })} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd}>Adicionar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
