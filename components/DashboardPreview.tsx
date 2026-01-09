
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, AreaChart, Area, 
  ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TableStore, DashboardConfig, ChartConfig } from '../types';
import { LOGOS, SOBSE_THEME } from '../constants';

interface Props {
  store: TableStore;
  config: DashboardConfig;
  mapping: any;
  onUpdateConfig?: (config: DashboardConfig) => void;
}

const CHART_PALETTE = [SOBSE_THEME.GUINDA, SOBSE_THEME.VERDE, SOBSE_THEME.DORADO, '#1E293B', '#475569', '#004d31', '#4d0d1e', '#8B1C3F'];

const CustomTooltip = ({ active, payload, label, dimensionAlias }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">
          {dimensionAlias || 'Detalle'}: <span className="text-white">{label || payload[0]?.payload?.name || ''}</span>
        </p>
        <div className="space-y-2">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex flex-col">
               <span className="text-white text-xl font-[900] tracking-tighter">
                 {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
               </span>
               <span className="text-[9px] font-bold text-slate-500 uppercase italic leading-none">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ChartCard = ({ chart, store, sIdx, cIdx, selectedRowIdx, onSelectRow }: any) => {
  const table = store[chart.tableName] || Object.values(store)[0];
  
  const chartData = useMemo(() => {
    if (!chart || !chart.tableName) return [];
    const t = store[chart.tableName] || Object.values(store)[0];
    if (!t || !t.rows || t.rows.length === 0) return [];
    
    const rowKeys = Object.keys(t.rows[0]);
    const normalize = (s: string) => s ? s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") : "";

    const dimKey = rowKeys.find(k => normalize(k) === normalize(chart.dimension)) || chart.dimension;
    const metKey = rowKeys.find(k => normalize(k) === normalize(chart.metric)) || chart.metric;
    const met2Key = chart.metric2 ? (rowKeys.find(k => normalize(k) === normalize(chart.metric2)) || chart.metric2) : null;

    if (chart.type === 'scatter') {
        return t.rows.map((r, idx) => ({
            name: String(r[dimKey] || 'N/A'),
            x: typeof r[metKey] === 'number' ? r[metKey] : parseFloat(String(r[metKey]).replace(/[^0-9.-]+/g, "")) || 0,
            y: met2Key ? (typeof r[met2Key] === 'number' ? r[met2Key] : parseFloat(String(r[met2Key]).replace(/[^0-9.-]+/g, "")) || 0) : idx,
            id: idx
        }));
    }

    if (chart.type === 'radar' && chart.metrics) {
        const row = t.rows[selectedRowIdx || 0];
        return chart.metrics.map(m => ({
            subject: m,
            A: typeof row[m] === 'number' ? row[m] : parseFloat(String(row[m]).replace(/[^0-9.-]+/g, "")) || 0,
            fullMark: 100
        }));
    }

    const map = new Map();
    t.rows.forEach(row => {
      const cat = String(row[dimKey] || 'N/A');
      const getVal = () => {
        const val = row[metKey];
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ""));
          return isNaN(parsed) ? 1 : parsed;
        }
        return 1;
      };
      
      if (!map.has(cat)) map.set(cat, { name: cat, [chart.metric]: 0 });
      const node = map.get(cat);
      if (node) node[chart.metric] += getVal();
    });

    const result = Array.from(map.values());
    if (chart.type === 'timeline') {
        return result.sort((a,b) => String(a.name).localeCompare(String(b.name), undefined, {numeric: true}));
    }
    return result.sort((a, b) => b[chart.metric] - a[chart.metric]).slice(0, 15);
  }, [chart, store, selectedRowIdx]);

  const dimAlias = table ? (table.columns[chart.dimension]?.alias || chart.dimension) : chart.dimension;
  const metAlias = table ? (table.columns[chart.metric]?.alias || chart.metric) : chart.metric;

  if (chart.type === 'radar') {
    return (
      <div className="col-span-12 lg:col-span-6 bg-white p-14 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col h-[500px]">
        <div className="mb-6">
          <h4 className="text-3xl font-[950] text-slate-900 uppercase italic tracking-tighter leading-none">{chart.title}</h4>
          <p className="text-[10px] font-black text-guinda uppercase tracking-widest mt-1 italic opacity-60">Desempeño Multidimensional</p>
        </div>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Valor" dataKey="A" stroke={chart.color} fill={chart.color} fillOpacity={0.5} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart.type === 'scatter') {
    return (
      <div className="col-span-12 lg:col-span-6 bg-white p-14 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col h-[500px]">
        <div className="mb-6">
          <h4 className="text-3xl font-[950] text-slate-900 uppercase italic tracking-tighter leading-none">{chart.title}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Correlación: {chart.metric} vs {chart.metric2 || 'Índice'}</p>
        </div>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" name={chart.metric} unit="" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis type="number" dataKey="y" name={chart.metric2 || 'Índice'} unit="" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <ZAxis type="number" range={[100, 1000]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter name="Registros" data={chartData} fill={chart.color}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} fillOpacity={0.6} strokeWidth={2} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart.type === 'technicalFile') {
    const row = table?.rows[selectedRowIdx || 0] || {};
    const keys = Object.keys(row).filter(k => !k.toLowerCase().includes('id') && !k.toLowerCase().includes('link')).slice(0, 12);
    return (
      <div className="col-span-12 bg-slate-900 rounded-[4rem] p-16 shadow-2xl border border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-12 text-white">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-4 bg-white/10 px-4 py-1 rounded-full border border-white/10">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest">EXPEDIENTE SELECCIONADO</span>
          </div>
          <h5 className="text-4xl font-[950] text-dorado uppercase italic leading-tight">{row[chart.dimension] || 'Ficha Técnica'}</h5>
          <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-4 scrollbar-hide">
            {keys.map((k, i) => (
              <div key={i} className="flex justify-between items-end gap-6 py-4 border-b border-white/10">
                <span className="text-[11px] font-black text-slate-500 uppercase italic tracking-tight shrink-0">{k}</span>
                <span className="text-[16px] font-black text-white truncate text-right">{String(row[k] || '---')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10 flex flex-col justify-center items-center space-y-8 backdrop-blur-md">
           <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">MÉTRICA CLAVE</p>
              <p className="text-7xl font-[950] text-white tracking-tighter italic">
                 {typeof row[chart.metric] === 'number' ? row[chart.metric].toLocaleString() : row[chart.metric] || '0'}
              </p>
              <p className="text-[12px] font-black text-dorado uppercase tracking-widest mt-4 italic">{chart.metric}</p>
           </div>
           <div className="flex gap-4 w-full px-10">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-guinda" style={{ width: '70%' }}></div>
              </div>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-verde" style={{ width: '45%' }}></div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (chart.type === 'table') {
    const rows = table?.rows.slice(0, 20) || [];
    const cols = Object.keys(rows[0] || {}).slice(0, 7);
    return (
      <div className="col-span-12 bg-white p-14 rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h4 className="text-3xl font-[950] text-slate-900 uppercase italic tracking-tighter leading-none">{chart.title}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Da clic en una fila para actualizar la ficha técnica</p>
          </div>
          <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest italic">{rows.length} REGISTROS</span>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-slate-50">
                {cols.map(c => <th key={c} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r, i) => (
                <tr key={i} onClick={() => onSelectRow(i)} className={`cursor-pointer transition-all ${selectedRowIdx === i ? 'bg-guinda/5 ring-1 ring-guinda/10' : 'hover:bg-slate-50/80'}`}>
                  {cols.map(c => <td key={c} className={`px-5 py-5 text-[12px] font-bold ${selectedRowIdx === i ? 'text-guinda' : 'text-slate-600'}`}>{String(r[c] || '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={`col-span-12 lg:col-span-6 bg-white p-14 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col transition-all hover:shadow-xl`}>
      <div className="mb-8">
        <h4 className="text-3xl font-[950] text-slate-900 uppercase italic tracking-tighter leading-none">{chart.title}</h4>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 opacity-60 italic">Fuente: {chart.tableName}</p>
      </div>
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'pie' ? (
            <PieChart>
              <Pie data={chartData} innerRadius={85} outerRadius={125} paddingAngle={6} dataKey={chart.metric} stroke="none">
                {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip dimensionAlias={dimAlias} />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '24px' }} />
            </PieChart>
          ) : (
            <BarChart data={chartData} margin={{ bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={8} fontWeight="900" angle={-20} textAnchor="end" tick={{ fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis fontSize={8} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8' }} />
              <Tooltip cursor={{fill: 'rgba(15, 23, 42, 0.02)'}} content={<CustomTooltip dimensionAlias={dimAlias} />} />
              <Bar dataKey={chart.metric} radius={[12, 12, 0, 0]} barSize={34} name={metAlias}>
                 {chartData.map((_, index) => (
                   <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                 ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DashboardPreview: React.FC<Props> = ({ store, config, onUpdateConfig }) => {
  const [selectedRowIdx, setSelectedRowIdx] = useState(0);

  return (
    <div className="space-y-24 pb-48 max-w-full overflow-x-hidden">
      {/* HEADER INSTITUCIONAL */}
      <div className="bg-white px-14 py-10 rounded-[4rem] shadow-sm flex items-center justify-between border border-slate-100 mx-4">
        <div className="flex items-center gap-10">
           <img src={LOGOS.CDMX} className="h-16 w-auto object-contain shrink-0" alt="CDMX" />
           <div className="h-12 w-[1.5px] bg-slate-100 shrink-0" />
           <img src={LOGOS.CORAZON} className="h-18 w-auto object-contain shrink-0" alt="SOBSE" />
           <div className="flex flex-col ml-4">
              <h2 className="text-3xl font-[950] text-slate-900 uppercase italic leading-none tracking-tighter">CEREBRO ESTRATÉGICO SOBSE</h2>
              <p className="text-[10px] font-black text-guinda uppercase tracking-[0.4em] mt-1 italic">SECRETARÍA DE OBRAS Y SERVICIOS · INTELIGENCIA DE DATOS</p>
           </div>
        </div>
      </div>

      {/* BANNER PRINCIPAL */}
      <div style={{ backgroundColor: config.headerBgColor }} className="rounded-[4.5rem] p-24 text-white shadow-2xl relative overflow-hidden mx-4 min-h-[500px] flex items-center">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[140px] -mr-32 -mt-32" />
        <div className="relative z-10 space-y-10 w-full">
          <div className="inline-flex items-center gap-5 bg-white/10 px-8 py-3 rounded-full border border-white/10 backdrop-blur-md">
            <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
            <span className="text-[12px] font-black uppercase tracking-[0.5em] italic">{config.topPillText || 'TABLERO TÉCNICO V.2.5'}</span>
          </div>
          <h1 className="text-[86px] font-[950] tracking-tighter italic uppercase leading-[0.8] drop-shadow-[0_10px_30px_rgba(0,0,0,0.3)]">{config.title}</h1>
          <p className="text-white/80 text-2xl font-medium italic max-w-5xl leading-relaxed drop-shadow-md">{config.subtitle}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-12 gap-10 px-4">
        {config.kpis.map((kpi, i) => {
          const table = store[kpi.tableName] || Object.values(store)[0];
          if (!table) return null;
          const val = table.rows.reduce((acc, r) => {
            const v = r[kpi.key];
            return acc + (typeof v === 'number' ? v : (parseFloat(String(v).replace(/[^0-9.-]+/g, "")) || 0));
          }, 0);
          return (
            <div key={i} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-14 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col justify-between group min-h-[220px] relative transition-all hover:translate-y-[-8px] hover:shadow-2xl">
              <div className="absolute top-0 left-0 bottom-0 w-3.5 bg-slate-50 group-hover:bg-guinda transition-all" style={{ backgroundColor: kpi.statusColor }} />
              <div className="space-y-3 relative z-10 pl-6">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none italic">{kpi.label}</p>
                <h4 className="text-5xl font-[950] text-slate-900 tracking-tighter leading-none italic">
                    {kpi.format === 'currency' ? `$ ${val.toLocaleString()}` : (kpi.format === 'percent' ? `${val.toFixed(2)}%` : val.toLocaleString())}
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECCIONES */}
      <div className="space-y-40">
          {config.sections.map((sec, sIdx) => (
            <section key={sIdx} className="space-y-16 px-4">
              <div className="flex flex-col gap-3 border-l-[12px] border-guinda pl-12">
                 <h2 className="text-6xl font-[950] text-slate-900 uppercase italic tracking-tighter leading-none">{sec.title}</h2>
                 <p className="text-2xl text-slate-400 font-medium italic leading-relaxed max-w-5xl opacity-80">{sec.description}</p>
              </div>
              <div className="grid grid-cols-12 gap-12">
                {sec.charts.map((chart, cIdx) => (
                  <ChartCard 
                    key={chart.id || `c-${sIdx}-${cIdx}`}
                    chart={chart}
                    store={store}
                    sIdx={sIdx}
                    cIdx={cIdx}
                    selectedRowIdx={selectedRowIdx}
                    onSelectRow={setSelectedRowIdx}
                  />
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
};

export default DashboardPreview;
