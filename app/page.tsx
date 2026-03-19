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
        <p style={{ color: '#ffffff', fontSize: '11px' }}>
          Leads: <b>{data.leads}</b>
        </p>
        <p style={{ color: '#ffffff', fontSize: '11px' }}>
          CPL: <b>R$ {data.cpl.toFixed(2)}</b>
        </p>
        <p style={{ color: '#ffffff', fontSize: '11px' }}>
          Gasto: <b>R$ {data.gasto.toFixed(2)}</b>
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
    <main className="min-h-screen p-6 md:p-12 bg-[#0a051a] text-purple-50">
      <div className="max-w-[1800px] mx-auto">

        {/* HEADER */}
        <header className="flex flex-col gap-6 mb-10">
          <div className="flex justify-between items-center">
            <Image src="/logo-empresa.png" alt="Logo" width={200} height={50} />

            <div className="flex gap-2">
              <button onClick={() => setPlataforma('meta_ads')} className="bg-blue-600 px-4 py-2 rounded">Meta</button>
              <button onClick={() => setPlataforma('google_ads')} className="bg-yellow-500 px-4 py-2 rounded text-black">Google</button>
            </div>

            <select value={gestorAtivo} onChange={(e) => setGestorAtivo(e.target.value)}>
              <option value="Todos">Todos</option>
              {opcoesGestores.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          {loading && <span className="text-purple-400 text-xs">Carregando...</span>}
        </header>

        {/* CARDS */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-purple-900/20 p-4 rounded">
            <p>Investimento</p>
            <h2>R$ {totalGasto.toFixed(2)}</h2>
          </div>

          <div className="bg-purple-900/20 p-4 rounded">
            <p>Leads</p>
            <h2>{totalLeads}</h2>
          </div>

          <div className="bg-purple-900/20 p-4 rounded">
            <p>CPL Médio</p>
            <h2>R$ {(totalGasto / (totalLeads || 1)).toFixed(2)}</h2>
          </div>
        </div>

        {/* GRÁFICO */}
        <div className="bg-purple-900/10 p-6 rounded h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={todosClientes}>
              <CartesianGrid stroke="#1f1433" />
              <XAxis dataKey="nome" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip content={<CustomTooltip />} />

              <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" />
              <Bar yAxisId="left" dataKey="cpl" fill="#4b2a85" />
              <Line yAxisId="right" dataKey="gasto" stroke="#10b981" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>
    </main>
  );
}
