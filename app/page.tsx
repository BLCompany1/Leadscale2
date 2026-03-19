"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import Image from 'next/image';

interface AdsData {
  [key: string]: any;
}

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
        <p style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>{data.nome}</p>
        <p style={{ color: '#ffffff', fontSize: '11px' }}>Leads: <b>{data.leads}</b></p>
        <p style={{ color: '#ffffff', fontSize: '11px' }}>CPL: <b>R$ {data.cpl.toFixed(2)}</b></p>
        <p style={{ color: '#ffffff', fontSize: '11px' }}>Investimento: <b>R$ {data.gasto.toFixed(2)}</b></p>
      </div>
    );
  }
  return null;
};

// ── SIDEBAR COMPONENT ──────────────────────────────────────────────────────────
interface ClienteItem {
  nome: string;
  gasto: number;
  leads: number;
  cpl: number;
}

function ClienteSidebar({
  clientes,
  plataforma,
  metaCPL = 100,
}: {
  clientes: ClienteItem[];
  plataforma: 'meta_ads' | 'google_ads';
  metaCPL?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const label = plataforma === 'google_ads' ? 'Google Ads' : 'Meta Ads';

  // S.O.S first (CPL above meta), then by CPL descending
  const sorted = useMemo(() => {
    return [...clientes].sort((a, b) => {
      const aSos = a.leads > 0 && a.cpl > metaCPL;
      const bSos = b.leads > 0 && b.cpl > metaCPL;
      if (aSos && !bSos) return -1;
      if (!aSos && bSos) return 1;
      return b.cpl - a.cpl;
    });
  }, [clientes, metaCPL]);

  const sosCount = sorted.filter(c => c.leads > 0 && c.cpl > metaCPL).length;
  const visible = showAll ? sorted : sorted.slice(0, 8);

  return (
    <aside style={{
      width: '300px',
      minWidth: '300px',
      background: '#13102a',
      border: '1px solid rgba(120,80,255,0.18)',
      borderRadius: '18px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 0 60px rgba(124,58,237,0.10), 0 2px 24px rgba(0,0,0,0.5)',
      position: 'relative',
      overflow: 'hidden',
      alignSelf: 'flex-start',
    }}>

      {/* top glow line */}
      <div style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px',
        background: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
        borderRadius: '99px',
      }} />

      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '1px solid rgba(120,80,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px',
      }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#c084fc', whiteSpace: 'nowrap',
        }}>
          Clientes {label}
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {sosCount > 0 && (
            <span style={{
              background: 'rgba(255,77,109,0.18)',
              border: '1px solid rgba(255,77,109,0.4)',
              borderRadius: '6px', padding: '2px 7px',
              fontSize: '9px', fontWeight: 800,
              color: '#ff4d6d', letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <span style={{ animation: 'sosPulse 1.2s ease-in-out infinite' }}>●</span>
              {sosCount} S.O.S
            </span>
          )}
          <span style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: '#fff', fontSize: '10px', fontWeight: 700,
            padding: '3px 9px', borderRadius: '99px',
          }}>
            {clientes.length}
          </span>
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{
        overflowY: 'auto',
        maxHeight: '500px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#7c3aed transparent',
      }}>
        {visible.map((cliente, i) => {
          const isSos = cliente.leads > 0 && cliente.cpl > metaCPL;
          return (
            <div key={cliente.nome} style={{
              background: isSos ? 'rgba(255,77,109,0.07)' : '#1a1535',
              border: `1px solid ${isSos ? 'rgba(255,77,109,0.28)' : 'rgba(120,80,255,0.16)'}`,
              borderRadius: '12px',
              padding: '11px 13px',
            }}>
              {/* Client name row */}
              <div style={{
                fontSize: '10.5px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#ffffff', marginBottom: '7px',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.38)', fontWeight: 600, flexShrink: 0 }}>
                  {i + 1}.
                </span>
                <span style={{
                  flex: 1, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cliente.nome}
                </span>
                {isSos && (
                  <span style={{
                    background: 'rgba(255,77,109,0.2)',
                    border: '1px solid rgba(255,77,109,0.4)',
                    borderRadius: '5px', padding: '1px 6px',
                    fontSize: '8.5px', fontWeight: 800, color: '#ff4d6d',
                    flexShrink: 0,
                  }}>
                    S.O.S
                  </span>
                )}
              </div>

              {/* Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{cliente.leads} Conv.</span>
                  <span style={{ fontWeight: 600, color: isSos ? '#ff4d6d' : '#00e5a0' }}>
                    CPL R$ {cliente.cpl.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Gasto</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    R$ {cliente.gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer button */}
      {sorted.length > 8 && (
        <div style={{
          padding: '10px 14px 14px',
          borderTop: '1px solid rgba(120,80,255,0.18)',
          display: 'flex', justifyContent: 'center',
        }}>
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              background: 'none',
              border: '1px solid rgba(120,80,255,0.28)',
              borderRadius: '8px',
              color: '#c084fc',
              fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '6px 18px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {showAll ? 'Ver menos' : `Ver todos (${sorted.length})`}
          </button>
        </div>
      )}

      <style>{`
        @keyframes sosPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
      `}</style>
    </aside>
  );
}
// ── END SIDEBAR ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<AdsData[]>([]);
  const [plataforma, setPlataforma] = useState<'meta_ads' | 'google_ads'>('meta_ads');
  const [gestorAtivo, setGestorAtivo] = useState('Todos');
  const [periodoRapido, setPeriodoRapido] = useState('7');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const cols = useMemo(() => {
    if (plataforma === 'google_ads') {
      return {
        cliente: 'cliente',
        gestor: 'gestor',
        gasto: 'gastoTotal',
        leads: 'leadsTotal',
        data: 'dataInicio',
      };
    }
    return {
      cliente: 'CLIENTE',
      gestor: 'Gestor',
      gasto: 'gasto',
      leads: 'leads',
      data: 'data_inicio',
    };
  }, [plataforma]);

  useEffect(() => {
    setIsMounted(true);
    async function fetchData() {
      setLoading(true);
      let allData: AdsData[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data: adsData, error } = await supabase
          .from(plataforma)
          .select('*')
          .not(cols.cliente, 'is', null)
          .range(from, to);

        if (error) {
          console.error(error);
          hasMore = false;
        } else if (adsData?.length) {
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
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return data.filter(item => {
      const dateVal = item[cols.data];
      if (!dateVal) return false;

      const itemDate = dateVal.substring(0, 10);
      let atendeData = false;

      if (dataInicio || dataFim) {
        atendeData =
          (!dataInicio || itemDate >= dataInicio) &&
          (!dataFim || itemDate <= dataFim);
      } else {
        const dias = parseInt(periodoRapido);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const fim = new Date(hoje);
        fim.setDate(hoje.getDate() - 1);

        const inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - dias);

        atendeData =
          itemDate >= formatDate(inicio) &&
          itemDate <= formatDate(fim);
      }

      return (gestorAtivo === 'Todos' || item[cols.gestor]?.trim() === gestorAtivo) && atendeData;
    });
  }, [data, gestorAtivo, dataInicio, dataFim, periodoRapido, cols]);

  const todosClientes = useMemo(() => {
    const parseVal = (v: any) =>
      typeof v === 'string' ? parseFloat(v.replace(',', '.')) || 0 : parseFloat(v) || 0;

    const nomes = [...new Set(dadosFiltrados.map(i => i[cols.cliente]?.trim()))].filter(Boolean);

    return nomes.map(nome => {
      const registros = dadosFiltrados.filter(d => d[cols.cliente]?.trim() === nome);
      const gasto = registros.reduce((acc, curr) => acc + parseVal(curr[cols.gasto]), 0);
      const leads = registros.reduce((acc, curr) => acc + parseVal(curr[cols.leads]), 0);
      const cpl = leads > 0 ? gasto / leads : 0;

      return {
        nome,
        gasto: +gasto.toFixed(2),
        leads,
        cpl: +cpl.toFixed(2),
      };
    }).sort((a, b) => b.gasto - a.gasto);
  }, [dadosFiltrados, cols]);

  const totalGasto = todosClientes.reduce((acc, c) => acc + c.gasto, 0);
  const totalLeads = todosClientes.reduce((acc, c) => acc + c.leads, 0);

  if (!isMounted) return null;

  return (
    <main className="min-h-screen p-6 md:p-12 bg-[#0a051a] text-purple-50 font-sans">
      <div className="max-w-[1800px] mx-auto">

        {/* HEADER */}
        <header className="flex flex-col gap-8 mb-12 border-b border-purple-900/40 pb-10">

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Image src="/logo-empresa.png" alt="Logo" width={200} height={50} className="h-12 w-auto" />

            <div className="flex bg-purple-900/40 p-1 rounded-xl border border-purple-700/50">
              <button
                onClick={() => setPlataforma('meta_ads')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase ${plataforma === 'meta_ads' ? 'bg-blue-600 text-white' : 'text-purple-400'}`}
              >
                Meta Ads
              </button>
              <button
                onClick={() => setPlataforma('google_ads')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase ${plataforma === 'google_ads' ? 'bg-yellow-500 text-black' : 'text-purple-400'}`}
              >
                Google Ads
              </button>
            </div>

            <select
              value={gestorAtivo}
              onChange={(e) => setGestorAtivo(e.target.value)}
              className="bg-purple-900/40 text-white px-4 py-2 rounded-full"
            >
              <option value="Todos">Todos</option>
              {opcoesGestores.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex gap-6 items-center">
              <div className="flex bg-purple-900/30 p-1 rounded-full border border-purple-700/50">
                {['1', '7', '14'].map((d) => (
                  <button
                    key={d}
                    onClick={() => { setPeriodoRapido(d); setDataInicio(''); setDataFim(''); }}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase ${
                      periodoRapido === d && !dataInicio && !dataFim
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'text-purple-400'
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 bg-purple-900/20 px-6 py-2 rounded-full border border-purple-700/30">
                <input
                  type="date" value={dataInicio}
                  onChange={(e) => { setDataInicio(e.target.value); setPeriodoRapido(''); }}
                  className="bg-transparent text-white text-[10px]"
                />
                <div className="h-4 w-[1px] bg-purple-700/30" />
                <input
                  type="date" value={dataFim}
                  onChange={(e) => { setDataFim(e.target.value); setPeriodoRapido(''); }}
                  className="bg-transparent text-white text-[10px]"
                />
              </div>
            </div>

            {loading && (
              <span className="text-purple-400 text-[10px] animate-pulse">SINCRONIZANDO...</span>
            )}
          </div>
        </header>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-purple-900/10 p-6 rounded-[2rem] text-center">
            <p className="text-purple-400 text-xs">Investimento</p>
            <p className="text-2xl font-bold">R$ {totalGasto.toFixed(2)}</p>
          </div>
          <div className="bg-purple-900/10 p-6 rounded-[2rem] text-center">
            <p className="text-purple-400 text-xs">Leads</p>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
          <div className="bg-purple-900/10 p-6 rounded-[2rem] text-center">
            <p className="text-purple-400 text-xs">CPL Médio</p>
            <p className="text-2xl font-bold">
              R$ {(totalGasto / (totalLeads || 1)).toFixed(2)}
            </p>
          </div>
        </div>

        {/* GRÁFICO + SIDEBAR */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

          {/* GRÁFICO — flex:1 ocupa o espaço restante */}
          <div
            className="bg-purple-900/5 p-8 rounded-[3rem] border border-purple-500/10"
            style={{ flex: 1, height: '500px' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={todosClientes}>
                <CartesianGrid stroke="#1f1433" />
                <XAxis dataKey="nome" stroke="#fff" fontSize={10} angle={-45} textAnchor="end" />
                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" />
                <Bar yAxisId="left" dataKey="cpl" fill="#4b2a85" />
                <Line yAxisId="right" dataKey="gasto" stroke="#10b981" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* SIDEBAR */}
          <ClienteSidebar
            clientes={todosClientes}
            plataforma={plataforma}
            metaCPL={100} // ← ajuste aqui a meta de CPL para alertas S.O.S
          />

        </div>

      </div>
    </main>
  );
}
