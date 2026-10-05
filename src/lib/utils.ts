export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num || 0);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function cleanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function whatsappLink(phone: string, message: string): string {
  const cleaned = cleanPhone(phone);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    Disponivel: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Alugado: 'bg-blue-100 text-blue-700 border-blue-300',
    Oficina: 'bg-amber-100 text-amber-700 border-amber-300',
    Ativo: 'bg-blue-100 text-blue-700 border-blue-300',
    Encerrado: 'bg-gray-100 text-gray-600 border-gray-300',
    Atrasado: 'bg-red-100 text-red-700 border-red-300',
    Aguardando: 'bg-gray-100 text-gray-600 border-gray-300',
    'Em Transito': 'bg-indigo-100 text-indigo-700 border-indigo-300',
    'Entregue na Obra': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'Coleta Solicitada': 'bg-amber-100 text-amber-700 border-amber-300',
    Coletado: 'bg-teal-100 text-teal-700 border-teal-300',
    Aberta: 'bg-amber-100 text-amber-700 border-amber-300',
    'Em Andamento': 'bg-blue-100 text-blue-700 border-blue-300',
    Concluida: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Pendente: 'bg-red-100 text-red-700 border-red-300',
    Pago: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Adimplente: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Inadimplente: 'bg-amber-100 text-amber-700 border-amber-300',
    Bloqueado: 'bg-red-100 text-red-700 border-red-300',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-300';
}
