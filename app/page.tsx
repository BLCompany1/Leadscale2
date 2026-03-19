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
  Cell,
  LabelList
} from 'recharts';
import Image from 'next/image';

// Interface genérica para suportar os dois formatos
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
        <p style={{ color: '#ffffff', fontSize: '11px', marginBottom: '4px' }}>
          Resultado: <span style={{ fontWeight: 'bold' }}>{data.leads}</span>
        </p>
        <p style={{ color: '#ffffff', fontSize: '11px', marginBottom: '4px' }}>
          CPL: <span style={{ fontWeight: 'bold' }}>R$ {data.cpl.toFixed(2)}</span>
        </p>
        <p style={{ color: '#ffffff', fontSize: '11px' }}>
          Investimento: <span style={{ fontWeight: 'bold' }}>R$ {data.gasto.toFixed(2)}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState<AdsData[]>([]);
  const [plataforma, setPlataforma] = useState<'meta_ads' | 'google_ads'>('meta_ads');
  const [gestorAtivo, setGestorAtivo] = useState('Todos');
  const [periodoRapido, setPeriodoRapido] = useState('7');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // MAPEAMENTO DE COLUNAS (DE ACORDO COM SEU SQL)
  const cols = useMemo(() => {
    if (plataforma === 'google_ads') {
      return {
        cliente: 'cliente',
        gestor: 'gestor',
        gasto: 'gastoTotal',
        leads: 'leadsTotal',
        data: 'dataInicio',
        meta: 'meta'
      };
    }
    return {
      cliente: 'CLIENTE',
      gestor: 'Gestor',
      gasto: 'gasto',
      leads: 'leads',
      data: 'data_inicio',
      meta: 'meta cpl'
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
          console.error('Erro:', error);
          hasMore = false;
        } else if (adsData && adsData.length > 0) {
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
    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return data.filter(item => {
      const dateVal = item[cols.data];
      if (!dateVal) return false;
      const itemDateStr = dateVal.substring(0, 10);
      let atendeData = false;

      if (dataInicio || dataFim) {
        atendeData = (!dataInicio || itemDateStr >= dataInicio) && (!dataFim || itemDateStr <= dataFim);
      } else {
        const dias = parseInt(periodoRapido);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataFinal = new Date(hoje);
        dataFinal.setDate(hoje.getDate() - 1);
        const dataInicial = new Date(hoje);
        dataInicial.setDate(hoje.getDate() - dias);
        atendeData = itemDateStr >= formatDate(dataInicial) && itemDateStr <= formatDate(dataFinal);
      }
      return (gestorAtivo === 'Todos' || item[cols.gestor]?.trim() === gestorAtivo) && atendeData;
    });
  }, [data, gestorAtivo, dataInicio, dataFim, periodoRapido, cols]);

  const todosClientes = useMemo(() => {
    const nomesUnicos = [...new Set(dadosFiltrados.map(i => i[cols.cliente]?.trim()))].filter(Boolean);

    return nomesUnicos.map(nome => {
      const registros = dadosFiltrados.filter(d => d[cols.cliente]?.trim() === nome);
      
      // Converte texto para número caso necessário (comum no Google Ads schema que você mandou)
      const parseVal = (val: any) => {
        if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0;
        return parseFloat(val) || 0;
      };

      const gasto = registros.reduce((acc, curr) => acc + parseVal(curr[cols.gasto]), 0);
      const leads = registros.reduce((acc, curr) => acc + parseVal(curr[cols.leads]), 0);
      const metaValor = parseVal(registros[0][cols.meta]);
      const cpl = leads > 0 ? gasto / leads : 0;
      
      return {
        nome,
        gasto: parseFloat(gasto.toFixed(2)),
        leads,
        cpl: parseFloat(cpl.toFixed(2)),
        meta: metaValor,
        estourouMeta: metaValor > 0 && cpl > metaValor
      };
    }).sort((a, b) => (a.estourouMeta === b.estourouMeta) ? b.gasto - a.gasto : a.estourouMeta ? -1 : 1);
  }, [dadosFiltrados, cols]);

  // Totais para os Cards
  const parseValTotal = (val: any) => {
    if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0;
    return parseFloat(val) || 0;
  };
  const totalGasto = dadosFiltrados.reduce((acc, curr) => acc + parseValTotal(curr[cols.gasto]), 0);
  const totalLeads = dadosFiltrados.reduce((acc, curr) => acc + parseValTotal(curr[cols.leads]), 0);
  const totalSOS = todosClientes.filter(c => c.estourouMeta).length;

  if (!isMounted) return null;

  return (
    <main className="min-h-screen p-6 md:p-12 bg-[#0a051a] text-purple-50 relative overflow-hidden font-sans">
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b2a85; border-radius: 10px; }`}</style>

      <div className="max-w-[1800px] mx-auto relative z-10">
        <header className="flex flex-col gap-8 mb-12 border-b border-purple-900/40 pb-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Image src="/logo-empresa.png" alt="Logo" width={200} height={50} className="h-12 w-auto" />
            
            <div className="flex bg-purple-900/40 p-1 rounded-xl border border-purple-700/50">
              <button 
                onClick={() => setPlataforma('meta_ads')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${plataforma === 'meta_ads' ? 'bg-blue-600 text-white shadow-lg' : 'text-purple-400 hover:text-white'}`}
              > Meta Ads </button>
              <button 
                onClick={() => setPlataforma('google_ads')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${plataforma === 'google_ads' ? 'bg-yellow-500 text-black shadow-lg' : 'text-purple-400 hover:text-white'}`}
              > Google Ads </button>
            </div>

            <select
              className="appearance-none bg-purple-900/40 backdrop-blur-md text-white font-bold py-2 px-8 rounded-full border border-purple-700/50 text-[10px] uppercase outline-none cursor-pointer hover:bg-purple-800 transition-all min-w-[200px]"
              value={gestorAtivo}
              onChange={(e) => setGestorAtivo(e.target.value)}
            >
              <option value="Todos">Visão Geral (Apenas S.O.S)</option>
              {opcoesGestores.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex gap-6 items-center">
                <div className="flex bg-purple-900/30 p-1 rounded-full border border-purple-700/50">
                {['1', '7', '14'].map((d) => (
                    <button key={d} onClick={() => { setPeriodoRapido(d); setDataInicio(''); setDataFim(''); }} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${periodoRapido === d && !dataInicio && !dataFim ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400 hover:text-purple-200'}`} > {d}D </button>
                ))}
                </div>
                <div className="flex items-center gap-4 bg-purple-900/20 px-6 py-2 rounded-full border border-purple-700/30">
                <input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPeriodoRapido(''); }} className="bg-transparent text-white text-[10px] font-bold outline-none uppercase cursor-pointer" />
                <div className="h-4 w-[1px] bg-purple-700/30"></div>
                <input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPeriodoRapido(''); }} className="bg-transparent text-white text-[10px] font-bold outline-none uppercase cursor-pointer" />
                </div>
            </div>
            {loading && <span className="text-purple-400 text-[10px] animate-pulse font-black">SINCRONIZANDO SUPABASE...</span>}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-purple-900/10 backdrop-blur-xl p-6 rounded-[2rem] border border-purple-500/20 text-center">
                <p className="text-purple-400 text-[9px] font-black uppercase mb-2 tracking-widest">Investimento {plataforma === 'meta_ads' ? 'Meta' : 'Google'}</p>
                <p className="text-3xl font-bold italic text-white">R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-purple-900/10 backdrop-blur-xl p-6 rounded-[2rem] border border-purple-500/20 text-center">
                <p className="text-purple-400 text-[9px] font-black uppercase mb-2 tracking-widest">{plataforma === 'meta_ads' ? 'Leads' : 'Conversões'}</p>
                <p className="text-4xl font-bold italic text-white">{totalLeads}</p>
              </div>
              <div className={`p-6 rounded-[2rem] border backdrop-blur-xl text-center ${totalSOS > 0 ? 'bg-red-900/20 border-red-500/40' : 'bg-purple-900/10 border-purple-500/20'}`}>
                <p className="text-red-400 text-[9px] font-black uppercase mb-2 tracking-widest">Clientes S.O.S</p>
                <p className="text-4xl font-bold italic text-red-500">{totalSOS}</p>
              </div>
            </div>

            <div className="bg-purple-900/5 backdrop-blur-md p-8 rounded-[3rem] border border-purple-500/10 h-[500px]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-6 flex items-center gap-2">
                {gestorAtivo === 'Todos' ? `🔴 Crítico ${plataforma}` : `📊 Performance ${plataforma}: ${gestorAtivo}`}
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={todosClientes.filter(c => gestorAtivo === 'Todos' ? c.estourouMeta : true)} margin={{ bottom: 100, top: 20, left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1433" />
                  <XAxis dataKey="nome" stroke="#ffffff" fontSize={10} interval={0} angle={-45} textAnchor="end" tickMargin={25} />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={25}>
                    <LabelList dataKey="leads" position="top" fill="#8b5cf6" fontSize={10} fontWeight="bold" />
                  </Bar>
                  <Bar yAxisId="left" dataKey="cpl" radius={[6, 6, 0, 0]} barSize={25}>
                    {todosClientes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.estourouMeta ? '#ef4444' : '#4b2a85'} />
                    ))}
                    <LabelList dataKey="cpl" position="top" fill="#fff" fontSize={9} formatter={(v: any) => `R$${Number(v).toFixed(2)}`} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="gasto" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-purple-900/20 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-purple-500/30 h-[750px] flex flex-col">
            <h2 className="text-[10px] font-black mb-6 uppercase tracking-widest text-purple-300 border-b border-purple-500/20 pb-4 text-center">
              Clientes {plataforma} ({todosClientes.length})
            </h2>
            <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
              {todosClientes.map((c, index) => (
                <div key={c.nome} className={`p-4 rounded-2xl border ${c.estourouMeta ? 'bg-red-950/40 border-red-500/60' : 'bg-purple-950/40 border-purple-800/30'}`}>
                  <p className="text-[10px] font-black uppercase text-white truncate">{index + 1}. {c.nome}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] text-purple-400 font-bold">{c.leads} {plataforma === 'meta_ads' ? 'Leads' : 'Conv.'}</span>
                    <span className={`text-xs font-black ${c.estourouMeta ? 'text-red-500' : 'text-white'}`}>R$ {c.cpl.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
