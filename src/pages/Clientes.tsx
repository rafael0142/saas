import { useState, useEffect } from 'react';
import { Plus, Users, Edit2, Trash2, Camera, Phone, Mail, Building } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge, PageHeader, EmptyState, LoadingSpinner, Modal, Input, Select } from '@/components/ui';
import { cn, cleanPhone } from '@/lib/utils';
import type { Cliente, StatusFinanceiro } from '@/types/database';

export default function Clientes() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome_razao_social: '',
    cnpj: '',
    email: '',
    status_financeiro: 'Adimplente' as StatusFinanceiro,
    whatsapp: '',
    imagem_buffer: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('nome_razao_social');
    setClientes(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditId(null);
    setForm({
      nome_razao_social: '',
      cnpj: '',
      email: '',
      status_financeiro: 'Adimplente',
      whatsapp: '',
      imagem_buffer: '',
    });
    setShowModal(true);
  }

  function openEdit(c: Cliente) {
    setEditId(c.id);
    setForm({
      nome_razao_social: c.nome_razao_social,
      cnpj: c.cnpj || '',
      email: c.email || '',
      status_financeiro: c.status_financeiro,
      whatsapp: c.whatsapp || '',
      imagem_buffer: c.imagem_buffer || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.nome_razao_social) return;
    const payload = {
      nome_razao_social: form.nome_razao_social,
      cnpj: form.cnpj || null,
      email: form.email || null,
      status_financeiro: form.status_financeiro,
      whatsapp: cleanPhone(form.whatsapp) || null,
      imagem_buffer: form.imagem_buffer || null,
    };
    if (editId) {
      const { data } = await supabase.from('clientes').update(payload).eq('id', editId).select('*').single();
      if (data) setClientes((prev) => prev.map((c) => (c.id === editId ? data : c)));
    } else {
      const { data } = await supabase.from('clientes').insert(payload).select('*').single();
      if (data) setClientes((prev) => [...prev, data].sort((a, b) => a.nome_razao_social.localeCompare(b.nome_razao_social)));
    }
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente?')) return;
    await supabase.from('clientes').delete().eq('id', id);
    setClientes((prev) => prev.filter((c) => c.id !== id));
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert('Imagem muito grande. Use até 500KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, imagem_buffer: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  if (loading) return <LoadingSpinner message="Carregando clientes..." />;

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cadastrados`}
        action={
          <Button onClick={openNew}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Novo Cliente
            </span>
          </Button>
        }
      />

      {clientes.length === 0 ? (
        <EmptyState message="Nenhum cliente cadastrado" icon={<Users size={32} />} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((c) => (
            <Card key={c.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {c.imagem_buffer ? (
                    <img src={c.imagem_buffer} alt={c.nome_razao_social} className="w-full h-full object-cover" />
                  ) : (
                    <Building size={22} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm truncate">{c.nome_razao_social}</h3>
                  <p className="text-xs text-slate-400">CNPJ: {c.cnpj || '-'}</p>
                  <div className="mt-1">
                    <Badge status={c.status_financeiro}>{c.status_financeiro}</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-500 mb-3">
                {c.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail size={12} /> {c.email}
                  </p>
                )}
                {c.whatsapp && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} /> {c.whatsapp}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                  <span className="flex items-center gap-1">
                    <Edit2 size={12} /> Editar
                  </span>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}>
                  <Trash2 size={14} className="text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Editar Cliente' : 'Novo Cliente'} size="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
              {form.imagem_buffer ? (
                <img src={form.imagem_buffer} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={24} className="text-slate-300" />
              )}
            </div>
            <div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
                  <Camera size={14} /> Carregar foto (Base64)
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {form.imagem_buffer && (
                <button
                  onClick={() => setForm({ ...form, imagem_buffer: '' })}
                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                >
                  Remover
                </button>
              )}
            </div>
          </div>

          <Input
            label="Nome / Razão Social"
            value={form.nome_razao_social}
            onChange={(v) => setForm({ ...form, nome_razao_social: v })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CNPJ"
              value={form.cnpj}
              onChange={(v) => setForm({ ...form, cnpj: v })}
              placeholder="00.000.000/0000-00"
            />
            <Select
              label="Status Financeiro"
              value={form.status_financeiro}
              onChange={(v) => setForm({ ...form, status_financeiro: v as StatusFinanceiro })}
              options={[
                { value: 'Adimplente', label: 'Adimplente' },
                { value: 'Inadimplente', label: 'Inadimplente' },
                { value: 'Bloqueado', label: 'Bloqueado' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Input
              label="WhatsApp (DDI+DDD+número)"
              value={form.whatsapp}
              onChange={(v) => setForm({ ...form, whatsapp: v })}
              placeholder="5511999999999"
            />
          </div>
          <p className="text-xs text-slate-400">
            O WhatsApp é armazenado apenas com números (DDI+DDD). Ex: 5511999999999
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!form.nome_razao_social}>
              {editId ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
