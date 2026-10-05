import { useState, useEffect } from 'react';
import { Truck, CheckCircle, MapPin, User, AlertTriangle, MessageSquare, PackageCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge, PageHeader, EmptyState, LoadingSpinner, Modal, Input, Textarea } from '@/components/ui';
import { formatDateTime, whatsappLink, cn } from '@/lib/utils';
import type { Locacao, Cliente } from '@/types/database';

export default function Expedicao() {
  const [loading, setLoading] = useState(true);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [checklistModal, setChecklistModal] = useState<Locacao | null>(null);
  const [coletaModal, setColetaModal] = useState<Locacao | null>(null);
  const [checklistObs, setChecklistObs] = useState('');
  const [motoristaColeta, setMotoristaColeta] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [l, c] = await Promise.all([
      supabase.from('locacoes').select('*, cliente:clientes(*), equipamento:equipamentos(*)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('*'),
    ]);
    setLocacoes(l.data || []);
    setClientes(c.data || []);
    setLoading(false);
  }

  async function updateLocacao(id: string, updates: Partial<Locacao>) {
    await supabase.from('locacoes').update(updates).eq('id', id);
    setLocacoes((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }

  async function handleChecklist() {
    if (!checklistModal) return;
    await updateLocacao(checklistModal.id, {
      checklist_saida_ok: true,
      checklist_saida_obs: checklistObs,
      status_expedicao: 'Em Transito',
    });
    setChecklistModal(null);
    setChecklistObs('');
  }

  async function handleConfirmarEntrega(loc: Locacao) {
    await updateLocacao(loc.id, {
      status_expedicao: 'Entregue na Obra',
      data_recebimento_obra: new Date().toISOString(),
    });
  }

  async function handleNotificarZap(loc: Locacao) {
    const cliente = clientes.find((c) => c.id === loc.cliente_id);
    if (cliente?.whatsapp) {
      const msg = `Olá ${cliente.nome_razao_social}, sua locação ${loc.numero_contrato} está atrasada. Por favor, entre em contato para regularização.`;
      window.open(whatsappLink(cliente.whatsapp, msg), '_blank');
    }
  }

  async function handleSolicitarColeta(loc: Locacao) {
    await updateLocacao(loc.id, {
      status_expedicao: 'Coleta Solicitada',
      data_solicitacao_retirada: new Date().toISOString(),
    });
  }

  async function handleConfirmarColeta() {
    if (!coletaModal) return;
    await updateLocacao(coletaModal.id, {
      status_expedicao: 'Coletado',
      motorista_coleta: motoristaColeta,
    });
    await supabase.from('equipamentos').update({ status_atual: 'Oficina' }).eq('id', coletaModal.equipamento_id);
    await supabase.from('ordens_oficina').insert({
      equipamento_id: coletaModal.equipamento_id,
      locacao_id: coletaModal.id,
      descricao_problema: 'Revisão pós-locação automática',
      status: 'Aberta',
      revisao_pos_locacao: true,
    });
    setColetaModal(null);
    setMotoristaColeta('');
    loadData();
  }

  if (loading) return <LoadingSpinner message="Carregando expedição..." />;

  const porStatus: Record<string, Locacao[]> = {
    Aguardando: [],
    'Em Transito': [],
    'Entregue na Obra': [],
    Atrasado: [],
    'Coleta Solicitada': [],
    Coletado: [],
  };
  locacoes.forEach((l) => {
    if (porStatus[l.status_expedicao]) porStatus[l.status_expedicao].push(l);
  });

  const colunas: { key: string; label: string; color: string }[] = [
    { key: 'Aguardando', label: 'Aguardando', color: 'border-t-gray-400' },
    { key: 'Em Transito', label: 'Em Trânsito', color: 'border-t-indigo-500' },
    { key: 'Entregue na Obra', label: 'Entregue na Obra', color: 'border-t-emerald-500' },
    { key: 'Atrasado', label: 'Atrasado', color: 'border-t-red-500' },
    { key: 'Coleta Solicitada', label: 'Coleta Solicitada', color: 'border-t-amber-500' },
    { key: 'Coletado', label: 'Coletado', color: 'border-t-teal-500' },
  ];

  return (
    <div>
      <PageHeader title="Expedição" subtitle="Gestão de entrega e coleta de equipamentos" />

      {locacoes.length === 0 ? (
        <EmptyState message="Nenhuma locação para expedir" icon={<Truck size={32} />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {colunas.map((col) => (
            <div key={col.key} className={cn('bg-slate-50 rounded-xl border-t-4', col.color)}>
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                  {col.label}
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                    {porStatus[col.key]?.length || 0}
                  </span>
                </h3>
              </div>
              <div className="p-3 space-y-2 min-h-[80px]">
                {(porStatus[col.key] || []).map((loc) => (
                  <Card key={loc.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm text-slate-800">{loc.equipamento?.nome_modelo}</p>
                        <p className="text-xs text-slate-500">{loc.numero_contrato}</p>
                        <p className="text-xs text-slate-400">{loc.cliente?.nome_razao_social}</p>
                      </div>
                      <Badge status={loc.status_expedicao}>{loc.status_expedicao}</Badge>
                    </div>
                    {loc.motorista_entrega && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                        <User size={12} /> Motorista: {loc.motorista_entrega}
                      </p>
                    )}
                    {loc.regiao_entrega && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                        <MapPin size={12} /> {loc.regiao_entrega}
                      </p>
                    )}
                    {loc.data_recebimento_obra && (
                      <p className="text-xs text-slate-400 mb-2">Recebido: {formatDateTime(loc.data_recebimento_obra)}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {loc.status_expedicao === 'Aguardando' && (
                        <>
                          <Input
                            value={loc.motorista_entrega || ''}
                            onChange={(v) => updateLocacao(loc.id, { motorista_entrega: v })}
                            placeholder="Motorista"
                            className="flex-1 min-w-[100px]"
                          />
                          <Input
                            value={loc.regiao_entrega || ''}
                            onChange={(v) => updateLocacao(loc.id, { regiao_entrega: v })}
                            placeholder="Região"
                            className="flex-1 min-w-[100px]"
                          />
                          <Button size="sm" onClick={() => setChecklistModal(loc)}>
                            Checklist
                          </Button>
                        </>
                      )}
                      {loc.status_expedicao === 'Em Transito' && (
                        <Button size="sm" variant="success" onClick={() => handleConfirmarEntrega(loc)}>
                          <span className="flex items-center gap-1">
                            <CheckCircle size={14} /> Confirmar Entrega
                          </span>
                        </Button>
                      )}
                      {loc.status_expedicao === 'Atrasado' && (
                        <>
                          <Button size="sm" variant="danger" onClick={() => handleNotificarZap(loc)}>
                            <span className="flex items-center gap-1">
                              <MessageSquare size={14} /> Notificar Zap
                            </span>
                          </Button>
                          <Button size="sm" variant="warning" onClick={() => handleSolicitarColeta(loc)}>
                            Solicitar Coleta
                          </Button>
                        </>
                      )}
                      {loc.status_expedicao === 'Entregue na Obra' && (
                        <Button size="sm" variant="warning" onClick={() => handleSolicitarColeta(loc)}>
                          Solicitar Coleta
                        </Button>
                      )}
                      {loc.status_expedicao === 'Coleta Solicitada' && (
                        <Button size="sm" variant="success" onClick={() => setColetaModal(loc)}>
                          <span className="flex items-center gap-1">
                            <PackageCheck size={14} /> Confirmar Coleta
                          </span>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!checklistModal} onClose={() => setChecklistModal(null)} title="Checklist de Saída">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium">{checklistModal?.equipamento?.nome_modelo}</p>
            <p className="text-xs">Contrato: {checklistModal?.numero_contrato}</p>
          </div>
          <Textarea
            label="Observações do Checklist"
            value={checklistObs}
            onChange={setChecklistObs}
            placeholder="Descreva o estado do equipamento na saída..."
            rows={4}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setChecklistModal(null)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleChecklist}>
              Aprovar e Enviar para Trânsito
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!coletaModal} onClose={() => setColetaModal(null)} title="Confirmar Coleta">
        <div className="space-y-4">
          <div className="bg-teal-50 rounded-lg p-3 text-sm text-teal-700">
            <p className="font-medium">{coletaModal?.equipamento?.nome_modelo}</p>
            <p className="text-xs">Contrato: {coletaModal?.numero_contrato}</p>
            <p className="text-xs mt-1">A máquina será enviada para Oficina com OS de revisão automática.</p>
          </div>
          <Input
            label="Motorista da Coleta"
            value={motoristaColeta}
            onChange={setMotoristaColeta}
            placeholder="Nome do motorista"
            required
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setColetaModal(null)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleConfirmarColeta}>
              Confirmar Coleta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
