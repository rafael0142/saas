import { useState } from 'react';
import { Menu, ChevronLeft, LogOut } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Clientes from '@/pages/Clientes';
import Equipamentos from '@/pages/Equipamentos';
import Contratos from '@/pages/Contratos';
import Expedicao from '@/pages/Expedicao';
import Oficina from '@/pages/Oficina';
import Estoque from '@/pages/Estoque';
import Caixa from '@/pages/Caixa';
import Orcamentos from '@/pages/Orcamentos';
import Vendas from '@/pages/Vendas';
import Fiscal from '@/pages/Fiscal';
import Usuarios from '@/pages/Usuarios';
import { AuthProvider, useAuth, roleLabels, roleColors, pagesForRole } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { Page, UserRole } from '@/types/database';

function AppInner() {
  const { user, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  const allowedPages = pagesForRole(user.role);

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <Dashboard />;
      case 'clientes':
        return <Clientes />;
      case 'equipamentos':
        return <Equipamentos />;
      case 'contratos':
        return <Contratos />;
      case 'expedicao':
        return <Expedicao />;
      case 'oficina':
        return <Oficina />;
      case 'estoque':
        return <Estoque />;
      case 'caixa':
        return <Caixa />;
      case 'orcamentos':
        return <Orcamentos />;
      case 'vendas':
        return <Vendas />;
      case 'fiscal':
        return <Fiscal />;
      case 'usuarios':
        return <Usuarios />;
      default:
        return <Dashboard />;
    }
  }

  function navigate(p: Page) {
    if (allowedPages.includes(p)) {
      setPage(p);
      setMobileOpen(false);
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <div className={`fixed inset-0 z-40 bg-slate-900/20 md:hidden ${mobileOpen ? 'block' : 'hidden'}`} onClick={() => setMobileOpen(false)} />

      <div className={`fixed md:relative z-50 md:z-0 h-full transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar current={page} onNavigate={navigate} collapsed={sidebarCollapsed} allowedPages={allowedPages} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={18} className="text-slate-600" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} className={`text-slate-400 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{user.nome}</p>
              <p className="text-xs text-slate-400">{roleLabels[user.role as UserRole]}</p>
            </div>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs', roleColors[user.role as UserRole])}>
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={signOut}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={16} className="text-slate-400" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
