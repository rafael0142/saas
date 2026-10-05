import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, DollarSign, Forklift, Wrench, AlertTriangle, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, StatCard, Select, LoadingSpinner, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import type { Cliente, Locacao, Equipamento, OrdemOficina, CaixaTransacao } from '@/types/database';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'geral' | 'cliente'>('geral');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [ordens, setOrdens] = useState<OrdemOficina[]>([]);
  const [caixa, setCaixa] = useState<CaixaTransacao[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [c, l, e, o, cx] = await Promise.all([
      supabase.from('clientes').select('*'),
      supabase.from('locacoes').select('*, cliente:clientes(*), equipamento:equipamentos(*)'),
      supabase.from('equipamentos').select('*, categorias(*)'),
      supabase.from('ordens_oficina').select('*, equipamento:equipamentos(*)'),
      supabase.from('caixa_transacoes').select('*, cliente:clientes(*)'),
    ]);
    setClientes(c.data || []);
    setLocacoes(l.data || []);
    setEquipamentos(e.data || []);
    setOrdens(o.data || []);
    setCaixa(cx.data || []);
    setLoading(false);
  }

  const filteredData = useMemo(() => {
    if (view === 'geral' || !selectedCliente) {
      return { locacoes, equipamentos, ordens, caixa };
    }
    return {
      locacoes: locacoes.filter((l) => l.cliente_id === selectedCliente),
      equipamentos: equipamentos.filter((eq) =>
        locacoes.some((l) => l.cliente_id === selectedCliente && l.equipamento_id === eq.id)
      ),
      ordens: ordens.filter((o) =>
        locacoes.some((l) => l.cliente_id === selectedCliente && l.equipamento_id === o.equipamento_id)
      ),
      caixa: caixa.filter((cx) => cx.cliente_id === selectedCliente),
    };
  }, [view, selectedCliente, locacoes, equipamentos, ordens, caixa]);

  const stats = useMemo(() => {
    const faturamento = filteredData.caixa
      .filter((c) => c.status === 'Pago')
      .reduce((sum, c) => sum + Number(c.valor_total_consolidado), 0);
    const pendente = filteredData.caixa
      .filter((c) => c.status === 'Pendente')
      .reduce((sum, c) => sum + Number(c.valor_total_consolidado), 0);
    const frotaTotal = filteredData.equipamentos.length;
    const frotaAlugada = filteredData.equipamentos.filter((e) => e.status_atual === 'Alugado').length;
    const frotaDisponivel = filteredData.equipamentos.filter((e) => e.status_atual === 'Disponivel').length;
    const frotaOficina = filteredData.equipamentos.filter((e) => e.status_atual === 'Oficina').length;
    const custoOS = filteredData.ordens.reduce(
      (sum, o) => sum + Number(o.valor_pecas) + Number(o.valor_mao_de_obra),
      0
    );
    const contratosAtivos = filteredData.locacoes.filter((l) => l.status === 'Ativo').length;
    const contratosAtrasados = filteredData.locacoes.filter((l) => l.status === 'Atrasado').length;
    return {
      faturamento,
      pendente,
      frotaTotal,
      frotaAlugada,
      frotaDisponivel,
      frotaOficina,
      custoOS,
      contratosAtivos,
      contratosAtrasados,
    };
  }, [filteredData]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    filteredData.caixa.forEach((c) => {
      if (c.status === 'Pago') {
        const d = new Date(c.created_at);
        const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
        months[key] = (months[key] || 0) + Number(c.valor_total_consolidado);
      }
    });
    const sorted = Object.entries(months).slice(-6);
    const maxVal = Math.max(...sorted.map(([, v]) => v), 1);
    return sorted.map(([label, value]) => ({ label, value, pct: (value / maxVal) * 100 }));
  }, [filteredData.caixa]);

  const statusDist = useMemo(() => {
    const total = filteredData.equipamentos.length || 1;
    const alugada = filteredData.equipamentos.filter((e) => e.status_atual === 'Alugado').length;
    const disponivel = filteredData.equipamentos.filter((e) => e.status_atual === 'Disponivel').length;
    const oficina = filteredData.equipamentos.filter((e) => e.status_atual === 'Oficina').length;
    return [
      { label: 'Alugado', count: alugada, pct: (alugada / total) * 100, color: 'bg-blue-500' },
      { label: 'Disponível', count: disponivel, pct: (disponivel / total) * 100, color: 'bg-emerald-500' },
      { label: 'Oficina', count: oficina, pct: (oficina / total) * 100, color: 'bg-amber-500' },
    ];
  }, [filteredData.equipamentos]);

  if (loading) return <LoadingSpinner message="Carregando dados do dashboard..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visão geral das operações</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('geral')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'geral' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Geral
            </button>
            <button
              onClick={() => setView('cliente')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'cliente' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Por Cliente
            </button>
          </div>
          {view === 'cliente' && (
            <Select
              value={selectedCliente}
              onChange={setSelectedCliente}
              options={clientes.map((c) => ({ value: c.id, label: c.nome_razao_social }))}
              className="w-56"
            />
          )}
        </div>
      </div>

      {view === 'cliente' && !selectedCliente && (
        <EmptyState message="Selecione um cliente para visualizar os dados filtrados" icon={<Users size={32} />} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Faturamento" value={formatCurrency(stats.faturamento)} icon={<DollarSign size={22} />} color="emerald" />
        <StatCard label="Pendente" value={formatCurrency(stats.pendente)} icon={<AlertTriangle size={22} />} color="amber" />
        <StatCard label="Custos de OS" value={formatCurrency(stats.custoOS)} icon={<Wrench size={22} />} color="red" />
        <StatCard label="Frota Total" value={stats.frotaTotal} icon={<Forklift size={22} />} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-700 text-sm">Faturamento Mensal</h3>
          </div>
          {monthlyData.length === 0 ? (
            <EmptyState message="Sem dados de faturamento ainda" />
          ) : (
            <div className="space-y-3">
              {monthlyData.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{m.label}</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(m.value)}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Forklift size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-700 text-sm">Status da Frota</h3>
          </div>
          {stats.frotaTotal === 0 ? (
            <EmptyState message="Nenhum equipamento cadastrado" />
          ) : (
            <div className="space-y-4">
              {statusDist.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{s.label}</span>
                    <span className="font-semibold text-slate-700">{s.count} ({s.pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.color} rounded-full transition-all duration-500`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Contratos Ativos</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.contratosAtivos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Contratos Atrasados</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.contratosAtrasados}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">OS em Andamento</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {filteredData.ordens.filter((o) => o.status !== 'Concluida').length}
          </p>
        </Card>
      </div>
    </div>
  );
}
