import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, PageHeader, EmptyState, LoadingSpinner, Modal, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuth, roleLabels, roleColors } from '@/lib/auth';
import type { UserProfile, UserRole } from '@/types/database';

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', nome: '', role: 'vendas' as UserRole });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    setUsuarios(data || []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.email || !form.password || !form.nome) return;
    setCreating(true);
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(form),
    });
    const result = await res.json();
    setCreating(false);
    if (!res.ok || result.error) {
      alert(result.error || 'Erro ao criar usuário');
      return;
    }
    setShowModal(false);
    setForm({ email: '', password: '', nome: '', role: 'vendas' });
    loadData();
  }

  async function handleUpdateRole(id: string, role: UserRole) {
    await supabase.from('user_profiles').update({ role }).eq('id', id);
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este usuário?')) return;
    await supabase.from('user_profiles').delete().eq('id', id);
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  }

  if (loading) return <LoadingSpinner message="Carregando usuários..." />;

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Gestão de contas e permissões"
        action={
          <Button onClick={() => setShowModal(true)}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Novo Usuário
            </span>
          </Button>
        }
      />

      <Card className="p-4 mb-6 bg-slate-50 border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Shield size={16} />
          <span>
            Você é <strong>{currentUser?.nome}</strong> — {roleLabels[currentUser?.role as UserRole]}
          </span>
        </div>
      </Card>

      {usuarios.length === 0 ? (
        <EmptyState message="Nenhum usuário cadastrado" icon={<UserIcon size={32} />} />
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <Card key={u.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold', roleColors[u.role])}>
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{u.nome}</p>
                  <p className="text-xs text-slate-400">{u.id === currentUser?.id ? 'Você' : 'Usuário'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {u.id === currentUser?.id ? (
                  <span className={cn('text-xs px-3 py-1 rounded-full font-medium', roleColors[u.role])}>
                    {roleLabels[u.role]}
                  </span>
                ) : (
                  <>
                    <Select
                      value={u.role}
                      onChange={(v) => handleUpdateRole(u.id, v as UserRole)}
                      options={[
                        { value: 'admin', label: 'Administrador' },
                        { value: 'vendas', label: 'Vendas' },
                        { value: 'mecanico', label: 'Mecânico' },
                        { value: 'almoxarifado', label: 'Almoxarifado' },
                      ]}
                      className="w-40"
                    />
                    <button onClick={() => handleDelete(u.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Usuário">
        <div className="space-y-4">
          <Input label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <Input label="Senha" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
          <Select
            label="Função"
            value={form.role}
            onChange={(v) => setForm({ ...form, role: v as UserRole })}
            options={[
              { value: 'admin', label: 'Administrador — acesso total' },
              { value: 'vendas', label: 'Vendas — clientes, orçamentos, vendas, caixa' },
              { value: 'mecanico', label: 'Mecânico — equipamentos, oficina' },
              { value: 'almoxarifado', label: 'Almoxarifado — equipamentos, estoque' },
            ]}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !form.email || !form.password || !form.nome}>
              {creating ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
