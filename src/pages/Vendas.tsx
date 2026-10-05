import { useState, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, Cloud, CloudRain, Sun, Megaphone, Users, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge, PageHeader, EmptyState, LoadingSpinner, Select, Textarea, Input } from '@/components/ui';
import { whatsappLink, cn } from '@/lib/utils';
import type { Cliente, Equipamento, ConfiguracaoVitrine, TipoClima } from '@/types/database';

export default function Vendas() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'whatsapp' | 'crm' | 'broadcast'>('whatsapp');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [vitrines, setVitrines] = useState<ConfiguracaoVitrine[]>([]);
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState('');
  const [clienteDetectado, setClienteDetectado] = useState<string | null>(null);
  const [equipamentosDetectados, setEquipamentosDetectados] = useState<string[]>([]);
  const [climaSelecionado, setClimaSelecionado] = useState<TipoClima>('Sol');
  const [descontoBroadcast, setDescontoBroadcast] = useState('10');
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [editMensagem, setEditMensagem] = useState('');
  const [editDesconto, setEditDesconto] = useState('10');
  const [editandoVitrine, setEditandoVitrine] = useState(false);
  const [equipamentosBroadcast, setEquipamentosBroadcast] = useState<string[]>([]);
  const [climaBroadcast, setClimaBroadcast] = useState<TipoClima | 'none'>('none');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [c, e, v] = await Promise.all([
      supabase.from('clientes').select('*').order('nome_razao_social'),
      supabase.from('equipamentos').select('*'),
      supabase.from('configuracao_vitrines_climaticas').select('*'),
    ]);
    setClientes(c.data || []);
    setEquipamentos(e.data || []);
    setVitrines(v.data || []);
    setLoading(false);
  }

  const vitrineAtual = vitrines.find((v) => v.tipo_clima === climaSelecionado);

  useEffect(() => {
    if (vitrineAtual) {
      setEditMensagem(vitrineAtual.mensagem_customizada_bot || '');
      setEditDesconto(String(vitrineAtual.desconto_porcentagem || 10));
    } else {
      setEditMensagem('');
      setEditDesconto('10');
    }
    setEditandoVitrine(false);
  }, [climaSelecionado, vitrines]);

  function analisarMensagem() {
    const msg = mensagemWhatsApp.toLowerCase();
    const clienteMatch = clientes.find((c) => msg.includes(c.nome_razao_social.toLowerCase()));
    setClienteDetectado(clienteMatch?.id || null);
    const equipMatch = equipamentos.filter((e) => msg.includes(e.nome_modelo.toLowerCase()));
    setEquipamentosDetectados(equipMatch.map((e) => e.id));
  }

  async function converterParaOrcamento() {
    const cliente = clientes.find((c) => c.id === clienteDetectado);
    if (!cliente) return;
    const nomesEquip = equipamentosDetectados
      .map((id) => equipamentos.find((e) => e.id === id)?.nome_modelo)
      .filter(Boolean);

    await supabase.from('orcamentos_recebidos').insert({
      cliente_nome: cliente.nome_razao_social,
      cliente_whatsapp: cliente.whatsapp,
      mensagem_original: mensagemWhatsApp,
      equipamentos_sugeridos: nomesEquip,
      status: 'Convertido',
    });

    const msg = `Olá ${cliente.nome_razao_social}, geramos seu orçamento para: ${nomesEquip.join(', ')}. Em breve enviaremos a proposta detalhada.`;
    if (cliente.whatsapp) {
      window.open(whatsappLink(cliente.whatsapp, msg), '_blank');
    }
    setMensagemWhatsApp('');
    setClienteDetectado(null);
    setEquipamentosDetectados([]);
  }

  async function salvarVitrine() {
    const sugestoes = equipamentos
      .filter((e) => e.status_atual === 'Disponivel')
      .slice(0, 5)
      .map((e) => e.nome_modelo);
    const existente = vitrines.find((v) => v.tipo_clima === climaSelecionado);
    if (existente) {
      await supabase
        .from('configuracao_vitrines_climaticas')
        .update({
          lista_equipamentos_sugeridos: sugestoes,
          mensagem_customizada_bot: editMensagem,
          desconto_porcentagem: parseFloat(editDesconto) || 0,
        })
        .eq('tipo_clima', climaSelecionado);
    } else {
      await supabase.from('configuracao_vitrines_climaticas').insert({
        tipo_clima: climaSelecionado,
        lista_equipamentos_sugeridos: sugestoes,
        desconto_porcentagem: parseFloat(editDesconto) || 0,
        mensagem_customizada_bot: editMensagem,
      });
    }
    setEditandoVitrine(false);
    loadData();
  }

  function gerarMensagemClima(): string {
    const vitrine = vitrineAtual;
    let msg = vitrine?.mensagem_customizada_bot || '';
    if (climaSelecionado === 'Chuva') {
      msg += `\n\nOfertas especiais para dias de chuva: Geradores e Bombas disponíveis!`;
    } else if (climaSelecionado === 'Sol') {
      msg += `\n\nAproveite o tempo seco: Equipamentos de terraplenagem com condições especiais!`;
    }
    if (vitrine?.lista_equipamentos_sugeridos?.length) {
      msg += `\n\nEquipamentos sugeridos: ${vitrine.lista_equipamentos_sugeridos.join(', ')}`;
    }
    if (vitrine && vitrine.desconto_porcentagem > 0) {
      msg += `\nDesconto de ${vitrine.desconto_porcentagem}% nesta semana!`;
    }
    return msg;
  }

  function gerarMensagemBroadcast(cliente: Cliente): string {
    let msg = `Olá ${cliente.nome_razao_social}!\n\n`;
    const equipNomes = equipamentosBroadcast
      .map((id) => equipamentos.find((e) => e.id === id)?.nome_modelo)
      .filter(Boolean);
    if (equipNomes.length > 0) {
      msg += `Temos os seguintes equipamentos ociosos disponíveis:\n`;
      equipNomes.forEach((n) => (msg += `• ${n}\n`));
    } else {
      const ociosos = equipamentos.filter((e) => e.status_atual === 'Disponivel').slice(0, 5);
      msg += `Temos equipamentos ociosos disponíveis:\n`;
      ociosos.forEach((e) => (msg += `• ${e.nome_modelo}\n`));
    }
    if (climaBroadcast !== 'none') {
      const vitrine = vitrines.find((v) => v.tipo_clima === climaBroadcast);
      if (climaBroadcast === 'Chuva') {
        msg += `\nOfertas especiais para dias de chuva: Geradores e Bombas disponíveis!`;
      } else if (climaBroadcast === 'Sol') {
        msg += `\nAproveite o tempo seco: Equipamentos de terraplenagem com condições especiais!`;
      }
      if (vitrine?.mensagem_customizada_bot) {
        msg += `\n${vitrine.mensagem_customizada_bot}`;
      }
    }
    if (parseFloat(descontoBroadcast) > 0) {
      msg += `\nDesconto de ${descontoBroadcast}% nesta semana!`;
    }
    return msg;
  }

  function dispararBroadcast() {
    destinatarios.forEach((clienteId) => {
      const cliente = clientes.find((c) => c.id === clienteId);
      if (cliente?.whatsapp) {
        const msg = gerarMensagemBroadcast(cliente);
        window.open(whatsappLink(cliente.whatsapp, msg), '_blank');
      }
    });
  }

  function toggleDestinatario(id: string) {
    setDestinatarios((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function toggleEquipamentoBroadcast(id: string) {
    setEquipamentosBroadcast((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  if (loading) return <LoadingSpinner message="Carregando vendas..." />;

  const climaIcon: Record<TipoClima, typeof Sun> = { Sol: Sun, Chuva: CloudRain, Nublado: Cloud };
  const equipamentosOciosos = equipamentos.filter((e) => e.status_atual === 'Disponivel');

  return (
    <div>
      <PageHeader title="Vendas" subtitle="WhatsApp, CRM Climático e Broadcast" />

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setTab('whatsapp')}
          className={cn('px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors', tab === 'whatsapp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
        >
          <span className="flex items-center gap-1.5"><MessageSquare size={15} /> WhatsApp</span>
        </button>
        <button
          onClick={() => setTab('crm')}
          className={cn('px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors', tab === 'crm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
        >
          <span className="flex items-center gap-1.5"><Sparkles size={15} /> CRM Climático</span>
        </button>
        <button
          onClick={() => setTab('broadcast')}
          className={cn('px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors', tab === 'broadcast' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
        >
          <span className="flex items-center gap-1.5"><Megaphone size={15} /> Broadcast</span>
        </button>
      </div>

      {tab === 'whatsapp' && (
        <Card className="p-5 max-w-3xl">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Captura de Mensagem do WhatsApp</h3>
          <Textarea
            label="Cole aqui a mensagem recebida do cliente"
            value={mensagemWhatsApp}
            onChange={setMensagemWhatsApp}
            placeholder="Ex: Olá, sou da Construtora Silva, preciso de orçamento para uma retroescavadeira e um compactador..."
            rows={5}
          />
          <div className="flex gap-2 mt-3">
            <Button variant="secondary" onClick={analisarMensagem} disabled={!mensagemWhatsApp}>
              <span className="flex items-center gap-1.5"><Sparkles size={14} /> Analisar</span>
            </Button>
          </div>

          {(clienteDetectado || equipamentosDetectados.length > 0) && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-900 text-sm mb-2">Resultado da Análise</p>
              {clienteDetectado && (
                <p className="text-sm text-slate-700">
                  <strong>Cliente:</strong> {clientes.find((c) => c.id === clienteDetectado)?.nome_razao_social}
                </p>
              )}
              {equipamentosDetectados.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-slate-700"><strong>Equipamentos:</strong></p>
                  <ul className="text-sm text-slate-600 mt-1 list-disc list-inside">
                    {equipamentosDetectados.map((id) => (
                      <li key={id}>{equipamentos.find((e) => e.id === id)?.nome_modelo}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button className="mt-3" onClick={converterParaOrcamento} disabled={!clienteDetectado}>
                <span className="flex items-center gap-1.5"><Send size={14} /> Converter em Orçamento</span>
              </Button>
            </div>
          )}
        </Card>
      )}

      {tab === 'crm' && (
        <div className="space-y-4 max-w-3xl">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">CRM Climático - Vitrines por Clima</h3>
            <div className="flex gap-2 mb-4">
              {(['Sol', 'Chuva', 'Nublado'] as TipoClima[]).map((clima) => {
                const Icon = climaIcon[clima];
                return (
                  <button
                    key={clima}
                    onClick={() => setClimaSelecionado(clima)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                      climaSelecionado === clima
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <Icon size={15} /> {clima}
                  </button>
                );
              })}
            </div>

            {vitrineAtual && !editandoVitrine && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium mb-2">Equipamentos sugeridos</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(vitrineAtual.lista_equipamentos_sugeridos || []).map((eq, i) => (
                    <span key={i} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">
                      {eq}
                    </span>
                  ))}
                  {(!vitrineAtual.lista_equipamentos_sugeridos || vitrineAtual.lista_equipamentos_sugeridos.length === 0) && (
                    <span className="text-xs text-slate-400">Nenhum equipamento configurado</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-2">Desconto: {vitrineAtual.desconto_porcentagem}%</p>
                <p className="text-xs text-slate-500 font-medium mb-1">Mensagem customizada:</p>
                <p className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-slate-200 whitespace-pre-wrap">
                  {vitrineAtual.mensagem_customizada_bot || '(vazio — clique em editar para escrever)'}
                </p>
              </div>
            )}

            {editandoVitrine && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <Textarea
                  label="Mensagem customizada do bot"
                  value={editMensagem}
                  onChange={setEditMensagem}
                  placeholder={
                    climaSelecionado === 'Chuva'
                      ? 'Ex: Aproveite o clima chuvoso! Temos geradores e bombas dágua prontos para entrega imediata...'
                      : climaSelecionado === 'Sol'
                      ? 'Ex: Tempo seco é ideal para terraplenagem! Alugue nossos equipamentos com condições especiais...'
                      : 'Ex: Confira nossas ofertas especiais desta semana...'
                  }
                  rows={5}
                />
                <Input
                  label="Desconto (%)"
                  type="number"
                  value={editDesconto}
                  onChange={setEditDesconto}
                  className="w-32"
                />
              </div>
            )}

            {climaSelecionado === 'Chuva' && (
              <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                Clima Chuva: anexa ofertas de geradores e bombas no rodapé das mensagens.
              </div>
            )}
            {climaSelecionado === 'Sol' && (
              <div className="mt-3 bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
                Clima Sol: sugere equipamentos de terraplenagem nas mensagens.
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {!editandoVitrine ? (
                <Button variant="secondary" onClick={() => setEditandoVitrine(true)}>
                  Editar Mensagem
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setEditandoVitrine(false)}>
                    Cancelar
                  </Button>
                  <Button variant="success" onClick={salvarVitrine}>
                    Salvar Vitrine
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  const msg = gerarMensagemClima();
                  navigator.clipboard?.writeText(msg);
                }}
              >
                Copiar Mensagem
              </Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'broadcast' && (
        <div className="space-y-4 max-w-3xl">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Megaphone size={16} /> Broadcast de Ativos Ociosos
            </h3>
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700 mb-4">
              {equipamentosOciosos.length} equipamento(s) ocioso(s) disponível para oferta.
            </div>

            <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
              <Package size={14} /> Selecionar equipamentos para a mensagem
            </p>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg mb-4">
              {equipamentosOciosos.map((eq) => (
                <label
                  key={eq.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 border-b border-slate-100 cursor-pointer text-sm',
                    equipamentosBroadcast.includes(eq.id) ? 'bg-slate-900/5' : 'hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={equipamentosBroadcast.includes(eq.id)}
                    onChange={() => toggleEquipamentoBroadcast(eq.id)}
                    className="rounded"
                  />
                  <span className="text-slate-700">{eq.nome_modelo}</span>
                  <span className="text-xs text-slate-400">({eq.codigo_patrimonio})</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Select
                label="Clima para a mensagem"
                value={climaBroadcast}
                onChange={(v) => setClimaBroadcast(v as TipoClima | 'none')}
                options={[
                  { value: 'none', label: 'Sem clima específico' },
                  { value: 'Sol', label: 'Sol - Terraplenagem' },
                  { value: 'Chuva', label: 'Chuva - Geradores/Bombas' },
                  { value: 'Nublado', label: 'Nublado - Geral' },
                ]}
              />
              <Input
                label="Desconto (%)"
                type="number"
                value={descontoBroadcast}
                onChange={setDescontoBroadcast}
              />
            </div>

            <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
              <Users size={14} /> Destinatários ({destinatarios.length} selecionado(s))
            </p>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg mb-4">
              {clientes.map((c) => (
                <label
                  key={c.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 border-b border-slate-100 cursor-pointer text-sm',
                    destinatarios.includes(c.id) ? 'bg-slate-900/5' : 'hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={destinatarios.includes(c.id)}
                    onChange={() => toggleDestinatario(c.id)}
                    className="rounded"
                  />
                  <span className="text-slate-700">{c.nome_razao_social}</span>
                  {c.whatsapp && <span className="text-xs text-slate-400">- {c.whatsapp}</span>}
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={dispararBroadcast} disabled={destinatarios.length === 0}>
                <span className="flex items-center gap-1.5"><Send size={14} /> Disparar para {destinatarios.length} contato(s)</span>
              </Button>
              <Button variant="ghost" onClick={() => { setDestinatarios([]); setEquipamentosBroadcast([]); }}>
                Limpar
              </Button>
            </div>

            {destinatarios.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Pré-visualização da mensagem (primeiro destinatário):</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {gerarMensagemBroadcast(clientes.find((c) => c.id === destinatarios[0]) || clientes[0])}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
