import { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List, Forklift, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Modal, Input, Select, Badge, PageHeader, EmptyState, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Equipamento, Categoria } from '@/types/database';

export default function Equipamentos() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome_modelo: '', codigo_patrimonio: '', categoria_id: '', imagem_url: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [e, c] = await Promise.all([
      supabase.from('equipamentos').select('*, categorias(*)').order('created_at', { ascending: false }),
      supabase.from('categorias').select('*'),
    ]);
    setEquipamentos(e.data || []);
    setCategorias(c.data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.nome_modelo || !form.codigo_patrimonio) return;
    const { data } = await supabase
      .from('equipamentos')
      .insert({
        nome_modelo: form.nome_modelo,
        codigo_patrimonio: form.codigo_patrimonio,
        categoria_id: form.categoria_id || null,
        imagem_url: form.imagem_url || null,
        status_atual: 'Disponivel',
      })
      .select('*, categorias(*)')
      .single();
    if (data) setEquipamentos((prev) => [data, ...prev]);
    setForm({ nome_modelo: '', codigo_patrimonio: '', categoria_id: '', imagem_url: '' });
    setShowModal(false);
  }

  if (loading) return <LoadingSpinner message="Carregando equipamentos..." />;

  return (
    <div>
      <PageHeader
        title="Equipamentos"
        subtitle={`${equipamentos.length} itens na frota`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('grid')}
                className={cn('p-1.5 rounded-md', view === 'grid' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400')}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn('p-1.5 rounded-md', view === 'list' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400')}
              >
                <List size={16} />
              </button>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Novo
              </span>
            </Button>
          </div>
        }
      />

      {equipamentos.length === 0 ? (
        <EmptyState message="Nenhum equipamento cadastrado ainda" icon={<Forklift size={32} />} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {equipamentos.map((eq) => (
            <Card key={eq.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden">
                {eq.imagem_url ? (
                  <img src={eq.imagem_url} alt={eq.nome_modelo} className="w-full h-full object-cover" />
                ) : (
                  <Forklift size={48} className="text-slate-300" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-800 text-sm truncate">{eq.nome_modelo}</h3>
                  <Badge status={eq.status_atual}>{eq.status_atual}</Badge>
                </div>
                <p className="text-xs text-slate-500">Patrimônio: {eq.codigo_patrimonio}</p>
                {eq.categorias && (
                  <span
                    className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{ backgroundColor: `${eq.categorias.cor_hex}20`, color: eq.categorias.cor_hex }}
                  >
                    {eq.categorias.nome}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                <th className="px-4 py-3 text-left font-semibold">Patrimônio</th>
                <th className="px-4 py-3 text-left font-semibold">Categoria</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipamentos.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800 font-medium">{eq.nome_modelo}</td>
                  <td className="px-4 py-3 text-slate-600">{eq.codigo_patrimonio}</td>
                  <td className="px-4 py-3 text-slate-600">{eq.categorias?.nome || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge status={eq.status_atual}>{eq.status_atual}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Equipamento">
        <div className="space-y-4">
          <Input label="Nome / Modelo" value={form.nome_modelo} onChange={(v) => setForm({ ...form, nome_modelo: v })} required />
          <Input
            label="Código Patrimônio"
            value={form.codigo_patrimonio}
            onChange={(v) => setForm({ ...form, codigo_patrimonio: v })}
            required
          />
          <Select
            label="Categoria"
            value={form.categoria_id}
            onChange={(v) => setForm({ ...form, categoria_id: v })}
            options={categorias.map((c) => ({ value: c.id, label: c.nome }))}
          />
          <Input
            label="URL da Imagem"
            value={form.imagem_url}
            onChange={(v) => setForm({ ...form, imagem_url: v })}
            placeholder="https://..."
          />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Camera size={14} />
            <span>Novos equipamentos entram como "Disponível"</span>
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
