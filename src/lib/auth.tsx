import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types/database';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          setUser(data as UserProfile | null);
        } else {
          setUser(null);
        }
        setLoading(false);
      })();
    });
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  vendas: 'Vendas',
  mecanico: 'Mecânico',
  almoxarifado: 'Almoxarifado',
};

export const roleColors: Record<UserRole, string> = {
  admin: 'bg-slate-700 text-white',
  vendas: 'bg-blue-600 text-white',
  mecanico: 'bg-amber-600 text-white',
  almoxarifado: 'bg-emerald-600 text-white',
};

export function pagesForRole(role: UserRole | undefined): import('@/types/database').Page[] {
  if (!role) return [];
  if (role === 'admin') {
    return ['dashboard', 'clientes', 'equipamentos', 'contratos', 'expedicao', 'oficina', 'estoque', 'caixa', 'orcamentos', 'vendas', 'fiscal', 'usuarios'];
  }
  if (role === 'vendas') {
    return ['dashboard', 'clientes', 'orcamentos', 'vendas', 'caixa'];
  }
  if (role === 'mecanico') {
    return ['dashboard', 'equipamentos', 'oficina'];
  }
  if (role === 'almoxarifado') {
    return ['dashboard', 'equipamentos', 'estoque'];
  }
  return ['dashboard'];
}
