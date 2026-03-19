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
    const d = payload[0].payload;
    return (
      <div className="bg-[#0a051a] border border-purple-600/40 rounded-2xl p-3 backdrop-blur-xl shadow-xl">
        <p className="text-white font-bold text-xs mb-1">{d.nome || d.data}</p>
        <p className="text-[11px]">Leads: <b>{d.leads}</b></p>
        <p className="text-[11px]">CPL: <b>R$ {d.cpl.toFixed(2)}</b></p>
        <p className="text-[11px]">Gasto: <b>R$ {d.gasto.toFixed(2)}</b></p>
      </div>
    );
  }
};

export default function Dashboard() {
  const [data, setData] = useState<AdsData[]>([]);
  const [plataforma, setPlataforma] = useState<'meta_ads' | 'google_ads'>('meta_ads');
  const [gestorAtivo, setGestorAtivo] = useState('Todos');
  const [periodoRapido, setPeriodoRapido] = useState('7');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);

  const cols = useMemo(() => {
    if (plataforma === 'google_ads') {
      return { cliente: 'cliente', gestor: 'gestor', gasto: 'gastoTotal', leads: 'leadsTotal', data: 'dataInicio' };
    }
    return { cliente: 'CLIENTE', gestor: 'Gestor', gasto: 'gasto', leads: 'leads', data: 'data_inicio' };
  }, [plataforma]);

  useEffect(() => {
    async function fetchData() {
      let all: AdsData[] = [];
      let page = 0;
      const size = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: d } = await supabase
          .from(plataforma)
          .select('*')
          .range(page * size, page * size + size - 1);

        if (d?.length) {
          all = [...all, ...d];
          if (d.length < size) hasMore = false;
          else page++;
        } else hasMore = false;
      }

      setData(all);
    }

    fetchData();
  }, [plataforma]);

  const dadosFiltrados = useMemo(() => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    return data.filter(item => {
      const val = item[cols.data];
      if (!val) return false;

      const dt = val.substring(0,10);

      let ok = false;

      if (dataInicio || dataFim) {
        ok = (!dataInicio || dt >= dataInicio) && (!dataFim || dt <= dataFim);
      } else {
        const dias = parseInt(periodoRapido);
        const hoje = new Date();
        const ini = new Date(hoje);
        ini.setDate(hoje.getDate() - dias);

        ok = dt >= fmt(ini);
      }

      return (gestorAtivo === 'Todos' || item[cols.gestor]?.trim() === gestorAtivo) && ok;
    });
  }, [data, gestorAtivo, dataInicio, dataFim, periodoRapido, cols]);

  const parse = (v: any) =>
    typeof v === 'string' ? parseFloat(v.replace(',', '.')) || 0 : parseFloat(v) || 0;

  const todosClientes = useMemo(() => {
    const nomes = [...new Set(dadosFiltrados.map(i => i[cols.cliente]))];

    return nomes.map(nome => {
      const regs = dadosFiltrados.filter(d => d[cols.cliente] === nome);

      const gasto = regs.reduce((a,c)=>a+parse(c[cols.gasto]),0);
      const leads = regs.reduce((a,c)=>a+parse(c[cols.leads]),0);
      const cpl = leads ? gasto/leads : 0;

      return { nome, gasto, leads, cpl };
    }).sort((a,b)=>b.gasto-a.gasto);
  }, [dadosFiltrados]);

  const dadosPorDia = useMemo(() => {
    if (!clienteSelecionado) return [];

    const regs = dadosFiltrados.filter(d => d[cols.cliente] === clienteSelecionado);
    const map: any = {};

    regs.forEach(r => {
      const d = r[cols.data].substring(0,10);
      if (!map[d]) map[d] = { data: d, gasto:0, leads:0 };

      map[d].gasto += parse(r[cols.gasto]);
      map[d].leads += parse(r[cols.leads]);
    });

    return Object.values(map).map((d:any)=>({
      ...d,
      cpl: d.leads ? d.gasto/d.leads : 0
    })).sort((a:any,b:any)=>a.data.localeCompare(b.data));

  }, [clienteSelecionado, dadosFiltrados]);

  const dadosGrafico = clienteSelecionado ? dadosPorDia : todosClientes;

  return (
    <main className="min-h-screen bg-[#0a051a] text-white relative overflow-hidden">

      {/* LOGO BACKGROUND */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <Image src="/logo-empresa.png" alt="bg" width={800} height={800} />
      </div>

      {/* GRADIENT GLOW */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-700/20 blur-[200px]" />

      <div className="relative z-10 p-8 max-w-[1800px] mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <Image src="/logo-empresa.png" alt="logo" width={160} height={40} />

          <div className="flex gap-3 bg-purple-900/40 p-1 rounded-xl backdrop-blur-xl">
            <button onClick={()=>setPlataforma('meta_ads')} className={`px-4 py-2 text-xs rounded ${plataforma==='meta_ads'?'bg-blue-600':''}`}>Meta</button>
            <button onClick={()=>setPlataforma('google_ads')} className={`px-4 py-2 text-xs rounded ${plataforma==='google_ads'?'bg-yellow-500 text-black':''}`}>Google</button>
          </div>
        </div>

        {/* GRID */}
        <div className="grid lg:grid-cols-[3fr_1fr] gap-8">

          {/* CHART */}
          <div className="bg-white/5 border border-purple-500/10 rounded-[30px] p-6 backdrop-blur-xl shadow-2xl">

            {clienteSelecionado && (
              <button onClick={()=>setClienteSelecionado(null)} className="text-xs mb-4 text-purple-300 underline">
                Limpar filtro ({clienteSelecionado})
              </button>
            )}

            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={dadosGrafico}>
                <CartesianGrid stroke="#1f1433" />

                <XAxis
                  dataKey={clienteSelecionado ? "data" : "nome"}
                  tickFormatter={(v)=>{
                    if(!clienteSelecionado) return v;
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth()+1}`;
                  }}
                />

                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" stroke="#10b981" />

                <Tooltip content={<CustomTooltip />} />

                <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" />
                <Bar yAxisId="left" dataKey="cpl" fill="#4b2a85" />
                <Line yAxisId="right" dataKey="gasto" stroke="#10b981" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* SIDEBAR */}
          <div className="bg-white/5 border border-purple-500/20 rounded-[30px] p-4 backdrop-blur-xl shadow-xl h-[500px] overflow-y-auto">

            {todosClientes.map(c=>{
              const ativo = clienteSelecionado === c.nome;

              return (
                <div
                  key={c.nome}
                  onClick={()=>setClienteSelecionado(c.nome)}
                  className={`p-3 mb-2 rounded-xl cursor-pointer transition-all
                  ${ativo
                    ? 'bg-purple-600 scale-[1.02]'
                    : 'bg-purple-900/40 hover:bg-purple-700/40'
                  }`}
                >
                  <p className="text-xs font-bold">{c.nome}</p>
                  <p className="text-[10px] text-purple-300">{c.leads} leads</p>
                </div>
              );
            })}

          </div>

        </div>
      </div>
    </main>
  );
}
