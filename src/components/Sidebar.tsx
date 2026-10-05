import {
  LayoutDashboard,
  Users,
  Forklift,
  FileText,
  Truck,
  Wrench,
  Package,
  DollarSign,
  ClipboardList,
  MessageSquare,
  Settings,
  UserCog,
} from 'lucide-react';
import type { Page } from '@/types/database';

const allMenuItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'equipamentos', label: 'Equipamentos', icon: Forklift },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'expedicao', label: 'Expedição', icon: Truck },
  { id: 'oficina', label: 'Oficina', icon: Wrench },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'caixa', label: 'Caixa', icon: DollarSign },
  { id: 'orcamentos', label: 'Orçamentos', icon: ClipboardList },
  { id: 'vendas', label: 'Vendas', icon: MessageSquare },
  { id: 'fiscal', label: 'Configurações Fiscais', icon: Settings },
  { id: 'usuarios', label: 'Usuários', icon: UserCog },
];

interface SidebarProps {
  current: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  allowedPages: Page[];
}

export default function Sidebar({ current, onNavigate, collapsed, allowedPages }: SidebarProps) {
  const menuItems = allMenuItems.filter((item) => allowedPages.includes(item.id));

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-56'} shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200`}
    >
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-white text-sm shrink-0">
          A
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-semibold text-sm text-slate-900 whitespace-nowrap">AlfaSys</div>
            <div className="text-[10px] text-slate-400 whitespace-nowrap">ERP Locação</div>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all relative ${
                active
                  ? 'text-slate-900 font-medium bg-slate-100'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={item.label}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
