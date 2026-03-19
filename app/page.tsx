"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import Image from 'next/image';

interface AdsData { [key: string]: any; }

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: '#0a051a',
        border: '1px solid #4b2a85',
        borderRadius: '20px',
        padding: '12px 16px'
      }}>
        <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
          {data.nome || data.data}
        </p>
        <p style={{ color: '#fff', fontSize: '11px' }}>Leads: <b>{data.leads}</b></p>
        <p style={{ color: '#fff', fontSize: '11px' }}>CPL: <b>R$ {data.cpl.toFixed(2)}</b></p>
        <p style={{ color: '#fff', fontSize: '11px' }}>Gasto: <b>R$ {data.gasto.toFixed(2)}</b></p>
      </div>
    );
  }
  return null;
};

function ClienteSidebar({
  clientes,
  plataforma,
  clienteSelecionado,
  onSelect,
}: {
  clientes: { nome: string; gasto: number; leads: number; cpl: number }[];
  plataforma: 'meta_ads' | 'google_ads';
  clienteSelecionado: string | null;
  onSelect: (nome: string) => void;
}) {
  const label = plataforma === 'google_ads' ? 'Google Ads' : 'Meta Ads';

  // Ordenado por CPL decrescente
  const sorted = useMemo(() =>
    [...clientes].sort((a, b) => b.cpl - a.cpl),
  [clientes]);

  return (
    <aside style={{
      background: '#13102a',
      border: '1px solid rgba(120,80,255,0.18)',
      borderRadius: '18px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 0 60px rgba(124,58,237,0.10), 0 2px 24px rgba(0,0,0,0.5)',
      position: 'relative',
      overflow: 'hidden',
      height: '500px',
    }}>

      {/* top glow line */}
      <div style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px',
        background: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
        borderRadius: '99px', zIndex: 1,
      }} />

      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '1px solid rgba(120,80,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', flexShrink: 0,
      }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#c084fc', whiteSpace: 'nowrap',
        }}>
          Clientes {label}
        </span>
        <span style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff', fontSize: '10px', fontWeight: 700,
          padding: '3px 9px', borderRadius: '99px',
        }}>
          {clientes.length}
        </span>
      </div>

      {/* Lista completa */}
      <div style={{
        overflowY: 'auto', flex: 1,
        padding: '10px 14px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        scrollbarWidth: 'thin', scrollbarColor: '#7c3aed transparent',
      }}>
        {sorted.map((c, i) => {
          const ativo = clienteSelecionado === c.nome;

          return (
            <div
              key={c.nome}
              onClick={() => onSelect(c.nome)}
              style={{
                background: ativo ? 'rgba(124,58,237,0.35)' : '#1a1535',
                border: `1px solid ${ativo ? 'rgba(168,85,247,0.6)' : 'rgba(120,80,255,0.16)'}`,
                borderRadius: '12px', padding: '11px 13px',
                cursor: 'pointer', transition: 'border-color .15s, background .15s',
              }}
            >
              {/* Nome */}
              <div style={{
                fontSize: '10.5px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#fff', marginBottom: '7px',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.38)', fontWeight: 600, flexShrink: 0 }}>
                  {i + 1}.
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.nome}
                </span>
              </div>

              {/* Métricas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{c.leads} Conv.</span>
                  <span style={{ fontWeight: 600, color: '#00e5a0' }}>
                    CPL R$ {c.cpl.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Gasto</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    R$ {c.gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<AdsData[]>([]);
  const [plataforma, setPlataforma] = useState<'meta_ads' | 'google_ads'>('meta_ads');
  const [gestorAtivo, setGestorAtivo] = useState('Todos');
  const [periodoRapido, setPeriodoRapido] = useState('7');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const cols = useMemo(() => {
    if (plataforma === 'google_ads') {
      return { cliente: 'cliente', gestor: 'gestor', gasto: 'gastoTotal', leads: 'leadsTotal', data: 'dataInicio' };
    }
    return { cliente: 'CLIENTE', gestor: 'Gestor', gasto: 'gasto', leads: 'leads', data: 'data_inicio' };
  }, [plataforma]);

  useEffect(() => {
    setIsMounted(true);
    async function fetchData() {
      setLoading(true);
      let allData: AdsData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: adsData } = await supabase
          .from(plataforma).select('*')
          .not(cols.cliente, 'is', null)
          .range(page * pageSize, page * pageSize + pageSize - 1);

        if (adsData?.length) {
          allData = [...allData, ...adsData];
          if (adsData.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      setData(allData);
      setLoading(false);
    }
    fetchData();
  }, [plataforma, cols]);

  const opcoesGestores = useMemo(() => {
    const gestores = data.map(i => i[cols.gestor]?.trim()).filter(Boolean);
    return [...new Set(gestores)].sort();
  }, [data, cols]);

  const dadosFiltrados = useMemo(() => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    return data.filter(item => {
      const dateVal = item[cols.data];
      if (!dateVal) return false;
      const itemDate = dateVal.substring(0, 10);
      let atendeData = false;

      if (dataInicio || dataFim) {
        atendeData = (!dataInicio || itemDate >= dataInicio) && (!dataFim || itemDate <= dataFim);
      } else {
        const dias = parseInt(periodoRapido);
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const fim = new Date(hoje);
        const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - dias);
        atendeData = itemDate >= fmt(inicio) && itemDate <= fmt(fim);
      }

      return (gestorAtivo === 'Todos' || item[cols.gestor]?.trim() === gestorAtivo) && atendeData;
    });
  }, [data, gestorAtivo, dataInicio, dataFim, periodoRapido, cols]);

  const todosClientes = useMemo(() => {
    const parse = (v: any) =>
      typeof v === 'string' ? parseFloat(v.replace(',', '.')) || 0 : parseFloat(v) || 0;

    const nomes = [...new Set(dadosFiltrados.map(i => i[cols.cliente]?.trim()))].filter(Boolean);

    return nomes.map(nome => {
      const regs = dadosFiltrados.filter(d => d[cols.cliente]?.trim() === nome);
      const gasto = regs.reduce((a, c) => a + parse(c[cols.gasto]), 0);
      const leads = regs.reduce((a, c) => a + parse(c[cols.leads]), 0);
      return { nome, gasto, leads, cpl: leads > 0 ? gasto / leads : 0 };
    }).sort((a, b) => b.gasto - a.gasto);
  }, [dadosFiltrados, cols]);

  const dadosPorDia = useMemo(() => {
    if (!clienteSelecionado) return [];
    const parse = (v: any) =>
      typeof v === 'string' ? parseFloat(v.replace(',', '.')) || 0 : parseFloat(v) || 0;

    const registros = dadosFiltrados.filter(d => d[cols.cliente]?.trim() === clienteSelecionado);
    const agrupado: any = {};

    registros.forEach(r => {
      const data = r[cols.data]?.substring(0, 10);
      if (!data) return;
      if (!agrupado[data]) agrupado[data] = { data, gasto: 0, leads: 0 };
      agrupado[data].gasto += parse(r[cols.gasto]);
      agrupado[data].leads += parse(r[cols.leads]);
    });

    return Object.values(agrupado)
      .map((d: any) => ({ ...d, cpl: d.leads > 0 ? d.gasto / d.leads : 0 }))
      .sort((a: any, b: any) => a.data.localeCompare(b.data));
  }, [clienteSelecionado, dadosFiltrados, cols]);

  const dadosGrafico = clienteSelecionado ? dadosPorDia : todosClientes;
  const totalGasto = dadosGrafico.reduce((a, c) => a + c.gasto, 0);
  const totalLeads = dadosGrafico.reduce((a, c) => a + c.leads, 0);

  if (!isMounted) return null;

  return (
    <main
      className="min-h-screen p-6 md:p-12 text-purple-50 font-sans"
      style={{ backgroundColor: '#0a051a', position: 'relative' }}
    >
      {/* Background logo watermark */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          backgroundImage: "url('/logo-empresa.png')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: '35%',
          opacity: 0.04,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="max-w-[1800px] mx-auto" style={{ position: 'relative', zIndex: 1 }}>

        {/* HEADER */}
        <header className="flex flex-col gap-8 mb-12 border-b border-purple-900/40 pb-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">

            <Image
              src="/logo-empresa.png"
              alt="Logo"
              width={220}
              height={64}
              className="w-auto"
              style={{ height: '64px' }}
              priority
            />

            <div className="flex bg-purple-900/40 p-1 rounded-xl border border-purple-700/50">
              <button onClick={() => setPlataforma('meta_ads')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black ${plataforma === 'meta_ads' ? 'bg-blue-600 text-white' : 'text-purple-400'}`}>
                Meta Ads
              </button>
              <button onClick={() => setPlataforma('google_ads')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black ${plataforma === 'google_ads' ? 'bg-yellow-500 text-black' : 'text-purple-400'}`}>
                Google Ads
              </button>
            </div>

            <select value={gestorAtivo} onChange={(e) => setGestorAtivo(e.target.value)}
              className="bg-purple-900/40 px-4 py-2 rounded-full text-white">
              <option value="Todos">Todos</option>
              {opcoesGestores.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className="flex bg-purple-900/30 p-1 rounded-full border border-purple-700/50">
                {['1','7','14'].map(d => (
                  <button key={d}
                    onClick={() => { setPeriodoRapido(d); setDataInicio(''); setDataFim(''); }}
                    className={`px-4 py-2 rounded-full text-xs font-black ${periodoRapido === d && !dataInicio && !dataFim ? 'bg-purple-600 text-white' : 'text-purple-400'}`}>
                    {d}D
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-purple-900/20 px-4 py-2 rounded-full border border-purple-700/30">
                <input type="date" value={dataInicio}
                  onChange={e => { setDataInicio(e.target.value); setPeriodoRapido(''); }}
                  className="bg-transparent text-white text-xs" />
                <div className="h-4 w-px bg-purple-700/30" />
                <input type="date" value={dataFim}
                  onChange={e => { setDataFim(e.target.value); setPeriodoRapido(''); }}
                  className="bg-transparent text-white text-xs" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {loading && <span className="text-purple-400 text-[10px] animate-pulse">SINCRONIZANDO...</span>}
              {clienteSelecionado && (
                <button
                  onClick={() => setClienteSelecionado(null)}
                  style={{
                    background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(168,85,247,0.4)',
                    borderRadius: '8px', color: '#c084fc',
                    fontSize: '10px', fontWeight: 700, padding: '5px 12px',
                    cursor: 'pointer', letterSpacing: '0.06em',
                  }}
                >
                  ✕ {clienteSelecionado}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* CARDS */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-purple-900/10 p-6 rounded-[2rem] text-center">
            <p className="text-purple-400 text-xs mb-1">Investimento</p>
            <p className="text-2xl font-bold">R$ {totalGasto.toFixed(2)}</p>
          </div>
          <div className="bg-purple-900/10 p-6 rounded-[2rem] text-center">
            <p className="text-purple-400 text-xs mb-1">Leads</p>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
          <div className="bg-purple-900/10 p-6 rounded-[2rem] text-center">
            <p className="text-purple-400 text-xs mb-1">CPL Médio</p>
            <p className="text-2xl font-bold">R$ {(totalGasto / (totalLeads || 1)).toFixed(2)}</p>
          </div>
        </div>

        {/* GRÁFICO + SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-8">

          <div className="bg-purple-900/5 p-8 rounded-3xl border border-purple-500/10 h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosGrafico}>
                <CartesianGrid stroke="#1f1433" />
                <XAxis
                  dataKey={clienteSelecionado ? 'data' : 'nome'}
                  stroke="#fff" fontSize={10} angle={-45} textAnchor="end"
                  tickFormatter={(v) => {
                    if (!clienteSelecionado) return v;
                    const d = new Date(`${v}T00:00:00`);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" />
                <Bar yAxisId="left" dataKey="cpl" fill="#4b2a85" />
                <Line yAxisId="right" dataKey="gasto" stroke="#10b981" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <ClienteSidebar
            clientes={todosClientes}
            plataforma={plataforma}
            clienteSelecionado={clienteSelecionado}
            onSelect={(nome) => setClienteSelecionado(prev => prev === nome ? null : nome)}
          />

        </div>
      </div>
    </main>
  );
}
