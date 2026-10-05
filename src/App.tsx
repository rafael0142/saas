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
  
  // Modais de Controle de Produção
  const [isNewMachineModalOpen, setIsNewMachineModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);

  // Estados de Coleções do Banco
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulários Nativos Preservados
  const [newMachine, setNewMachine] = useState({
    name: '', category: '', status: 'available' as const, daily_rate: 0,
    last_maintenance: new Date().toISOString().split('T'),
    next_maintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')
  });

  const [newClient, setNewClient] = useState({
    name: '', company_name: '', document: '', email: '', phone: ''
  });

  const [newContract, setNewContract] = useState({
    client_id: '', machine_id: '',
    start_date: new Date().toISOString().split('T'),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T'),
    daily_rate: 0
  });

  useEffect(() => {
    fetchData();
  }, []);
export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'machines' | 'clients' | 'contracts' | 'billing'>('dashboard');
  
  // Modais de Controle de Produção
  const [isNewMachineModalOpen, setIsNewMachineModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);

  // Estados de Coleções do Banco
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulários Nativos Preservados
  const [newMachine, setNewMachine] = useState({
    name: '', category: '', status: 'available' as const, daily_rate: 0,
    last_maintenance: new Date().toISOString().split('T'),
    next_maintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')
  });

  const [newClient, setNewClient] = useState({
    name: '', company_name: '', document: '', email: '', phone: ''
  });

  const [newContract, setNewContract] = useState({
    client_id: '', machine_id: '',
    start_date: new Date().toISOString().split('T'),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T'),
    daily_rate: 0
  });

  useEffect(() => {
    fetchData();
  }, []);
              {/* Seção de Equipamentos original mapeada por condicionais */}
              {activeTab === 'machines' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Equipamentos</h1>
                      <p className="text-slate-400 text-sm">Gerencie a frota de máquinas, taxas e revisões.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      
                      {/* BOTÃO DA NOVA CATEGORIA TOTALMENTE INTEGRADO EM PORTUGUÊS */}
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

                  {/* A tabela estrutural que lista suas máquinas segue exatamente abaixo... */}
      {/* Gatilho assíncrono para renderizar o modal de categoria ao ser clicado */}
      <CreateCategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
      />

      {/* Modal antigo nativo de cadastrar equipamento */}
      {isNewMachineModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          {/* ... conteúdo do formulário antigo preservado ... */}
        </div>
      )}
    </div>
  );
}
