import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  Filter,
  Eye,
  FileText,
  Calendar,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { CreateCategoryModal } from './components/CreateCategoryModal';

// Interfaces de Dados de Produção
interface Machine {
  id: string;
  name: string;
  category: string;
  status: 'available' | 'rented' | 'maintenance';
  last_maintenance: string;
  next_maintenance: string;
  daily_rate: number;
  image_url?: string;
}

interface Client {
  id: string;
  name: string;
  company_name?: string;
  document: string;
  email: string;
  phone: string;
}

interface Contract {
  id: string;
  contract_number: string;
  client_id: string;
  machine_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  total_value: number;
}
export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'machines' | 'clients' | 'contracts' | 'billing'>('dashboard');
  
  // Modais de Controle (Inclusão apenas do trigger de categorias)
  const [isNewMachineModalOpen, setIsNewMachineModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);

  // Estados de Dados da Aplicação
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Formulários Nativos
  const [newMachine, setNewMachine] = useState({
    name: '',
    category: '',
    status: 'available' as const,
    daily_rate: 0,
    last_maintenance: new Date().toISOString().split('T')[0],
    next_maintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [newClient, setNewClient] = useState({
    name: '',
    company_name: '',
    document: '',
    email: '',
    phone: ''
  });

  const [newContract, setNewContract] = useState({
    client_id: '',
    machine_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    daily_rate: 0
  });

  useEffect(() => {
    fetchData();
  }, []);
  async function fetchData() {
    try {
      setLoading(true);
      const [machinesRes, clientsRes, contractsRes] = await Promise.all([
        supabase.from('machines').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('contracts').select('*').order('created_at', { ascending: false })
      ]);

      if (machinesRes.data) setMachines(machinesRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (contractsRes.data) setContracts(contractsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMachine(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from('machines').insert([newMachine]).select();
    if (error) alert('Erro ao cadastrar máquina: ' + error.message);
    else {
      if (data) setMachines([data[0], ...machines]);
      setIsNewMachineModalOpen(false);
      setNewMachine({
        name: '',
        category: '',
        status: 'available',
        daily_rate: 0,
        last_maintenance: new Date().toISOString().split('T')[0],
        next_maintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from('clients').insert([newClient]).select();
    if (error) alert('Erro ao cadastrar cliente: ' + error.message);
    else {
      if (data) setClients([data[0], ...clients]);
      setIsNewClientModalOpen(false);
      setNewClient({ name: '', company_name: '', document: '', email: '', phone: '' });
    }
  }

  async function handleCreateContract(e: React.FormEvent) {
    e.preventDefault();
    const machine = machines.find(m => m.id === newContract.machine_id);
    if (!machine) return;

    const start = new Date(newContract.start_date);
    const end = new Date(newContract.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const total_value = days * (newContract.daily_rate || machine.daily_rate);

    const contractNumber = `CTR-${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabase.from('contracts').insert([{
      contract_number: contractNumber,
      client_id: newContract.client_id,
      machine_id: newContract.machine_id,
      start_date: newContract.start_date,
      end_date: newContract.end_date,
      status: 'active',
      total_value
    }]).select();

    if (error) alert('Erro ao criar contrato: ' + error.message);
    else {
      await supabase.from('machines').update({ status: 'rented' }).eq('id', newContract.machine_id);
      if (data) setContracts([data[0], ...contracts]);
      setIsNewContractModalOpen(false);
      fetchData();
    }
  }

  const stats = {
    totalMachines: machines.length,
    rentedMachines: machines.filter(m => m.status === 'rented').length,
    availableMachines: machines.filter(m => m.status === 'available').length,
    maintenanceMachines: machines.filter(m => m.status === 'maintenance').length,
    activeContracts: contracts.filter(c => c.status === 'active').length,
    totalBilling: contracts.reduce((acc, c) => acc + (c.status === 'active' ? c.total_value : 0), 0)
  };
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-hidden">
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider text-white block">MÁQUINA</span>
              <span className="text-xs text-blue-500 font-semibold tracking-widest uppercase block -mt-1">Control</span>
            </div>
          </div>
          
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('machines')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'machines' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Truck className="h-4 w-4" /> Equipamentos
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'clients' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" /> Clientes
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'contracts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <FileText className="h-4 w-4" /> Contratos
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'billing' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <DollarSign className="h-4 w-4" /> Financeiro
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center bg-slate-950/50">
          v1.0.0 &copy; Máquina Control
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-900">
        <header className="bg-slate-950 border-b border-slate-800 h-16 flex items-center justify-between px-8 shrink-0">
          <div className="text-sm font-semibold tracking-wide text-slate-300">
            {activeTab === 'dashboard' && 'Visão Geral do Sistema'}
            {activeTab === 'machines' && 'Gerenciamento de Frota'}
            {activeTab === 'clients' && 'Cadastro de Clientes'}
            {activeTab === 'contracts' && 'Controle de Locações'}
            {activeTab === 'billing' && 'Faturamento e Receitas'}
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-sm">R</div>
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 font-medium">Carregando dados...</div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
                      <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-xl"><Truck className="h-6 w-6" /></div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Frota Total</p>
                        <p className="text-2xl font-bold text-white mt-0.5">{stats.totalMachines}</p>
                      </div>
                    </div>
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
                      <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 rounded-xl"><CheckCircle2 className="h-6 w-6" /></div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Disponíveis</p>
                        <p className="text-2xl font-bold text-white mt-0.5">{stats.availableMachines}</p>
                      </div>
                    </div>
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
                      <div className="p-3 bg-amber-600/10 border border-amber-500/20 text-amber-500 rounded-xl"><Clock className="h-6 w-6" /></div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Locadas</p>
                        <p className="text-2xl font-bold text-white mt-0.5">{stats.rentedMachines}</p>
                      </div>
                    </div>
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
                      <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-xl"><AlertTriangle className="h-6 w-6" /></div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Manutenção</p>
                        <p className="text-2xl font-bold text-white mt-0.5">{stats.maintenanceMachines}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'machines' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Equipamentos</h1>
                      <p className="text-slate-400 text-sm">Gerencie a frota de máquinas, taxas e revisões.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* INSERÇÃO CIRÚRGICA DO BOTÃO NA PÁGINA DE EQUIPAMENTOS */}
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-4 py-2 rounded-xl transition-all shadow-sm text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Nova Categoria</span>
                      </button>
                      <button
                        onClick={() => setIsNewMachineModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Novo Equipamento</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-slate-800 flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input type="text" placeholder="Buscar máquina..." className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="p-4">Equipamento</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4">Diária</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Próxima Revisão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300">
                          {machines.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-900/30 transition-colors">
                              <td className="p-4 font-bold text-white">{m.name}</td>
                              <td className="p-4 text-slate-400">{m.category}</td>
                              <td className="p-4 font-semibold text-slate-200">R\$ {m.daily_rate.toLocaleString('pt-BR')}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  m.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  m.status === 'rented' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {m.status === 'available' ? 'Disponível' : m.status === 'rented' ? 'Alugado' : 'Manutenção'}
                                </span>
                              </td>
                              <td className="p-4 text-slate-400">{m.next_maintenance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'clients' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Clientes</h1>
                    <button onClick={() => setIsNewClientModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-lg shadow-blue-600/20"><Plus className="h-4 w-4" /><span>Novo Cliente</span></button>
                  </div>
                </div>
              )}

              {activeTab === 'contracts' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Contratos de Locação</h1>
                    <button onClick={() => setIsNewContractModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-lg shadow-blue-600/20"><Plus className="h-4 w-4" /><span>Novo Contrato</span></button>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-6 animate-fade-in">
                  <h1 className="text-2xl font-bold text-white">Financeiro</h1>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Renderização do componente injetado de Nova Categoria */}
      <CreateCategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />

      {/* Modal original de cadastro de equipamentos intacto */}
      {isNewMachineModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-white mb-4">Novo Equipamento</h3>
            <form onSubmit={handleCreateMachine} className="space-y-4">
              <input type="text" required placeholder="Nome do Equipamento" value={newMachine.name} onChange={e => setNewMachine({...newMachine, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none" />
              <input type="text" required placeholder="Categoria" value={newMachine.category} onChange={e => setNewMachine({...newMachine, category: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none" />
              <input type="number" required placeholder="Valor da Diária (R$)" value={newMachine.daily_rate || ''} onChange={e => setNewMachine({...newMachine, daily_rate: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none" />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsNewMachineModalOpen(false)} className="px-4 py-2 bg-slate-900 text-slate-400 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
