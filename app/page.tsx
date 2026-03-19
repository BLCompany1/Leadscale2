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
        <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
          {data.nome || data.data}
        </p>
        <p style={{ fontSize: '11px' }}>Leads: <b>{data.leads}</b></p>
        <p style={{ fontSize: '11px' }}>CPL: <b>R$ {data.cpl.toFixed(2)}</b></p>
        <p style={{ fontSize: '11px' }}>Gasto: <b>R$ {data.gasto.toFixed(2)}</b></p>
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
      let allData: AdsData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data: adsData } = await supabase
          .from(plataforma)
          .select('*')
          .not(cols.cliente, 'is', null)
          .range(from, to);

        if (adsData?.length) {
          allData = [...allData, ...adsData];
          if (adsData.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      setData(allData);
    }

    fetchData();
  }, [plataforma, cols]);

  const dadosFiltrados = useMemo(() => {
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return data.filter(item => {
      const dateVal = item[cols.data];
      if (!dateVal) return false;

      const itemDate = dateVal.substring(0, 10);

      let ok = false;

      if (dataInicio || dataFim) {
        ok =
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

        ok =
          itemDate >= formatDate(inicio) &&
          itemDate <= formatDate(fim);
      }

      return (gestorAtivo === 'Todos' || item[cols.gestor]?.trim() === gestorAtivo) && ok;
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
      const cpl = leads > 0 ? gasto / leads : 0;

      return { nome, gasto, leads, cpl };
    }).sort((a, b) => b.gasto - a.gasto);
  }, [dadosFiltrados, cols]);

  // 🔥 TIMELINE POR DIA
  const dadosPorDia = useMemo(() => {
    if (!clienteSelecionado) return [];

    const parse = (v: any) =>
      typeof v === 'string' ? parseFloat(v.replace(',', '.')) || 0 : parseFloat(v) || 0;

    const registros = dadosFiltrados.filter(
      d => d[cols.cliente]?.trim() === clienteSelecionado
    );

    const agrupado: any = {};

    registros.forEach(r => {
      const data = r[cols.data]?.substring(0, 10);
      if (!data) return;

      if (!agrupado[data]) {
        agrupado[data] = { data, gasto: 0, leads: 0 };
      }

      agrupado[data].gasto += parse(r[cols.gasto]);
      agrupado[data].leads += parse(r[cols.leads]);
    });

    return Object.values(agrupado)
      .map((d: any) => ({
        ...d,
        cpl: d.leads > 0 ? d.gasto / d.leads : 0
      }))
      .sort((a: any, b: any) => a.data.localeCompare(b.data));
  }, [clienteSelecionado, dadosFiltrados, cols]);

  const dadosGrafico = clienteSelecionado ? dadosPorDia : todosClientes;

  if (!isMounted) return null;

  return (
    <main className="min-h-screen p-6 bg-[#0a051a] text-white">

      <div className="max-w-[1800px] mx-auto">

        <header className="mb-6">
          <Image src="/logo-empresa.png" alt="Logo" width={200} height={50} />
          {clienteSelecionado && (
            <button
              onClick={() => setClienteSelecionado(null)}
              className="text-xs underline mt-2"
            >
              Limpar ({clienteSelecionado})
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-8">

          {/* GRÁFICO */}
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosGrafico}>
                <CartesianGrid stroke="#1f1433" />

                <XAxis
                  dataKey={clienteSelecionado ? "data" : "nome"}
                  tickFormatter={(value) => {
                    if (!clienteSelecionado) return value;
                    const d = new Date(value);
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

          {/* SIDEBAR */}
          <div className="bg-purple-900/20 p-6 rounded-xl h-[500px] overflow-y-auto">
            {todosClientes.map((c) => {
              const ativo = clienteSelecionado === c.nome;

              return (
                <div
                  key={c.nome}
                  onClick={() => setClienteSelecionado(c.nome)}
                  className={`p-3 mb-2 cursor-pointer rounded
                    ${ativo ? 'bg-purple-600' : 'bg-purple-900/40'}
                  `}
                >
                  <p>{c.nome}</p>
                  <p>{c.leads} leads</p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </main>
  );
}
