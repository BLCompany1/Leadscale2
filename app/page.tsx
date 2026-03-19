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
  CartesianGrid
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

  // 🔥 FILTRO DO GRÁFICO POR CLIENTE
  const dadosGrafico = clienteSelecionado
    ? todosClientes.filter(c => c.nome === clienteSelecionado)
    : todosClientes;

  const totalGasto = dadosGrafico.reduce((acc, c) => acc + c.gasto, 0);
  const totalLeads = dadosGrafico.reduce((acc, c) => acc + c.leads, 0);

  if (!isMounted) return null;

  return (
    <main className="min-h-screen p-6 md:p-12 bg-[#0a051a] text-purple-50 font-sans">

      <div className="max-w-[1800px] mx-auto">

        {/* HEADER */}
        <header className="flex flex-col gap-8 mb-12 border-b border-purple-900/40 pb-10">

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Image src="/logo-empresa.png" alt="Logo" width={200} height={50} className="h-12 w-auto" />

            <div className="flex bg-purple-900/40 p-1 rounded-xl border border-purple-700/50">
              <button onClick={() => setPlataforma('meta_ads')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase ${plataforma === 'meta_ads' ? 'bg-blue-600 text-white' : 'text-purple-400'}`}>
                Meta Ads
              </button>
              <button onClick={() => setPlataforma('google_ads')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase ${plataforma === 'google_ads' ? 'bg-yellow-500 text-black' : 'text-purple-400'}`}>
                Google Ads
              </button>
            </div>

            <select value={gestorAtivo} onChange={(e) => setGestorAtivo(e.target.value)} className="bg-purple-900/40 text-white px-4 py-2 rounded-full">
              <option value="Todos">Todos</option>
              {opcoesGestores.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex justify-between items-center">
            {clienteSelecionado && (
              <button
                onClick={() => setClienteSelecionado(null)}
                className="text-xs text-purple-300 underline"
              >
                Limpar seleção ({clienteSelecionado})
              </button>
            )}
            {loading && <span className="text-purple-400 text-[10px] animate-pulse">SINCRONIZANDO...</span>}
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
            <p className="text-2xl font-bold">R$ {(totalGasto / (totalLeads || 1)).toFixed(2)}</p>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-8">

          {/* GRÁFICO */}
          <div className="bg-purple-900/5 p-8 rounded-[3rem] border border-purple-500/10 h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosGrafico}>
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
          <div className="bg-purple-900/20 p-6 rounded-[2.5rem] border border-purple-500/20 h-[500px] flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-4 text-center">
              Clientes ({todosClientes.length})
            </h2>

            <div className="overflow-y-auto flex flex-col gap-3 pr-2">
              {todosClientes.map((c, index) => {
                const ativo = clienteSelecionado === c.nome;

                return (
                  <div
                    key={c.nome}
                    onClick={() => setClienteSelecionado(c.nome)}
                    className={`p-4 rounded-xl cursor-pointer transition-all
                      ${ativo
                        ? 'bg-purple-600 border border-purple-300 scale-[1.02]'
                        : 'bg-purple-950/40 border border-purple-800/40 hover:bg-purple-800/40'
                      }`}
                  >
                    <p className="text-[10px] font-black uppercase text-white truncate">
                      {index + 1}. {c.nome}
                    </p>

                    <div className="flex justify-between mt-2 text-[9px]">
                      <span className="text-purple-300 font-bold">
                        {c.leads} leads
                      </span>
                      <span className="text-white font-black">
                        CPL R$ {c.cpl.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between mt-1 text-[9px]">
                      <span className="text-green-400 font-bold">
                        R$ {c.gasto.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
