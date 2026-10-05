import { useState } from 'react';
import { Settings, Zap, Key, FileText, Mail, Send, CheckCircle } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

type ModeloFiscal = 'freemium' | 'byok' | 'auto';

export default function Fiscal() {
  const [modelo, setModelo] = useState<ModeloFiscal>('freemium');
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('');
  const [limiteMensal, setLimiteMensal] = useState('50');
  const [emitidas, setEmitidas] = useState('12');
  const [autoConfig, setAutoConfig] = useState({
    gerarXML: true,
    transmitirSefaz: true,
    enviarEmail: true,
  });

  const modelos: { id: ModeloFiscal; label: string; icon: typeof Zap; desc: string; color: string }[] = [
    {
      id: 'freemium',
      label: 'Freemium',
      icon: Zap,
      desc: 'Emissão interna grátis com limite mensal',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      id: 'byok',
      label: 'BYOK',
      icon: Key,
      desc: 'Cliente insere sua própria API Key (Focus/Bling)',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'auto',
      label: 'Automação Total',
      icon: FileText,
      desc: 'Fatura paga dispara XML -> Sefaz -> e-mail automático',
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <div>
      <PageHeader title="Configurações Fiscais" subtitle="Gestão de emissão de notas fiscais" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {modelos.map((m) => {
          const Icon = m.icon;
          const active = modelo === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setModelo(m.id)}
              className={cn(
                'text-left rounded-xl border-2 p-5 transition-all',
                active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white mb-3', m.color)}>
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">{m.label}</h3>
              <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
              {active && (
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <CheckCircle size={14} /> Selecionado
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Card className="p-5">
        {modelo === 'freemium' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 text-sm">Modelo Freemium - Emissão Interna</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Limite mensal de NFes"
                type="number"
                value={limiteMensal}
                onChange={setLimiteMensal}
              />
              <Input
                label="Emitidas este mês"
                type="number"
                value={emitidas}
                onChange={setEmitidas}
              />
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Uso do mês</span>
                <span className="text-sm font-semibold text-slate-700">
                  {emitidas} / {limiteMensal}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min((parseInt(emitidas) / parseInt(limiteMensal)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <Button>
              <span className="flex items-center gap-1.5"><FileText size={16} /> Emitir NFe</span>
            </Button>
          </div>
        )}

        {modelo === 'byok' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 text-sm">BYOK - Sua Própria API Key</h3>
            <Select
              label="Provedor"
              value={provider}
              onChange={setProvider}
              options={[
                { value: 'focus', label: 'Focus NFe' },
                { value: 'bling', label: 'Bling' },
                { value: 'nfe_io', label: 'NFe.io' },
              ]}
            />
            <Input
              label="API Key"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder="Cole sua API key aqui..."
            />
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              Sua chave é armazenada com segurança e usada apenas para emissão de notas fiscais.
              Nunca é compartilhada ou exposta no frontend.
            </div>
            <div className="flex gap-2">
              <Button disabled={!apiKey || !provider}>
                <span className="flex items-center gap-1.5"><Key size={16} /> Salvar e Testar Conexão</span>
              </Button>
            </div>
          </div>
        )}

        {modelo === 'auto' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 text-sm">Automação Total</h3>
            <p className="text-sm text-slate-600">
              Quando uma fatura é marcada como "Pago" no Caixa, o sistema automaticamente:
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConfig.gerarXML}
                  onChange={(e) => setAutoConfig({ ...autoConfig, gerarXML: e.target.checked })}
                  className="rounded"
                />
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Gerar XML da NFe</p>
                    <p className="text-xs text-slate-500">Cria o arquivo XML com os dados da fatura</p>
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConfig.transmitirSefaz}
                  onChange={(e) => setAutoConfig({ ...autoConfig, transmitirSefaz: e.target.checked })}
                  className="rounded"
                />
                <div className="flex items-center gap-2">
                  <Send size={18} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Transmitir para Sefaz</p>
                    <p className="text-xs text-slate-500">Envia o XML para a Sefaz e aguarda autorização</p>
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConfig.enviarEmail}
                  onChange={(e) => setAutoConfig({ ...autoConfig, enviarEmail: e.target.checked })}
                  className="rounded"
                />
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Enviar XML + PDF por e-mail</p>
                    <p className="text-xs text-slate-500">Envia a nota autorizada para o e-mail do cliente</p>
                  </div>
                </div>
              </label>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
              <p className="flex items-center gap-2">
                <Zap size={16} />
                Fluxo automático: Fatura Paga → Gerar XML → Transmitir Sefaz → E-mail ao Cliente
              </p>
            </div>
            <Select
              label="Provedor para transmissão"
              value={provider}
              onChange={setProvider}
              options={[
                { value: 'focus', label: 'Focus NFe' },
                { value: 'bling', label: 'Bling' },
                { value: 'interno', label: 'Emissor Interno' },
              ]}
            />
            <Input
              label="API Key do provedor"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder="Cole sua API key..."
            />
            <Button disabled={!apiKey || !provider}>
              Ativar Automação
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5 mt-4">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Notas Recentes</h3>
        <div className="space-y-2">
          {[
            { numero: 'NFe 001/2026', cliente: 'Construtora Silva', valor: 'R$ 4.500,00', status: 'Autorizada' },
            { numero: 'NFe 002/2026', cliente: 'Empreiteira Santos', valor: 'R$ 2.800,00', status: 'Pendente' },
            { numero: 'NFe 003/2026', cliente: 'Obras RJ Ltda', valor: 'R$ 6.200,00', status: 'Autorizada' },
          ].map((n, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{n.numero}</p>
                <p className="text-xs text-slate-500">{n.cliente} - {n.valor}</p>
              </div>
              <Badge status={n.status === 'Autorizada' ? 'Pago' : 'Pendente'}>{n.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
