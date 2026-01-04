
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import { TableStore, DashboardConfig, ChartConfig } from '../types';
import { LOGOS } from '../constants';

interface Props {
  store: TableStore;
  config: DashboardConfig;
  mapping: any;
  onUpdateConfig?: (config: DashboardConfig) => void;
}

const CustomTooltip = ({ active, payload, label, dimensionAlias, metricAlias }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col gap-1 min-w-[240px] animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">
          {dimensionAlias}: <span className="text-slate-900">{label}</span>
        </p>
        <div className="space-y-3 mb-3">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex flex-col gap-0.5">
               <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none" style={{ color: p.color }}>
                 {p.value.toLocaleString()}
               </p>
               <p className="text-[9px] font-bold text-slate-400 uppercase italic">{p.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const DashboardPreview: React.FC<Props> = ({ store, config, onUpdateConfig }) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const getAlias = (tableName: string, colName: string) => store[tableName]?.columns[colName]?.alias || colName;

  const handleUpdate = (updater: (prev: DashboardConfig) => DashboardConfig) => {
    if (onUpdateConfig) onUpdateConfig(updater(config));
  };

  const processChartData = (chart: ChartConfig) => {
    const table = store[chart.tableName];
    if (!table) return [];
    
    if (chart.type === 'timeline') {
      return table.rows.slice(0, 15).map(r => ({
        name: String(r[chart.dimension] || 'N/A'),
        start: new Date(r[chart.startDateCol || ''] || Date.now()).getTime(),
        end: new Date(r[chart.endDateCol || ''] || Date.now()).getTime(),
        duration: Math.max(0, new Date(r[chart.endDateCol || ''] || Date.now()).getTime() - new Date(r[chart.startDateCol || ''] || Date.now()).getTime())
      })).filter(d => !isNaN(d.start));
    }

    const map = new Map();
    const series = [chart.metric, ...(chart.metrics || [])];
    
    table.rows.forEach(row => {
      const cat = String(row[chart.dimension] || 'Sin Dato');
      const getVal = (m: string) => {
        const rv = row[m];
        if (typeof rv === 'number') return rv;
        if (typeof rv === 'string') return parseFloat(rv.replace(/[^0-9.-]+/g, "")) || 0;
        return 0;
      };
      
      if (!map.has(cat)) {
        const initialData: any = { name: cat };
        series.forEach(s => initialData[s] = 0);
        map.set(cat, initialData);
      }
      
      const node = map.get(cat);
      series.forEach(s => node[s] += getVal(s));
    });
    return Array.from(map.values()).sort((a, b) => (b[chart.metric] || 0) - (a[chart.metric] || 0)).slice(0, 20);
  };

  const kpis = useMemo(() => {
    return config.kpis.map(kpi => {
      const table = store[kpi.tableName];
      if (!table) return { ...kpi, display: 'N/A' };
      const values = table.rows.map(r => {
        const v = r[kpi.key];
        return typeof v === 'number' ? v : (parseFloat(String(v).replace(/[^0-9.-]+/g, "")) || 0);
      });
      const total = values.reduce((acc, v) => acc + v, 0);
      const avg = total / (table.rows.length || 1);
      const val = kpi.format === 'percent' ? avg : total;
      
      let display = "";
      if (kpi.format === 'currency') display = `$ ${val.toLocaleString()}`;
      else if (kpi.format === 'mdp') display = `$ ${(val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MDP`;
      else if (kpi.format === 'percent') display = `${val.toFixed(1)}%`;
      else display = val.toLocaleString();

      return { ...kpi, display };
    });
  }, [store, config]);

  const EditableText = ({ id, value, className, onSave, multiline = false }: { id: string, value: string, className: string, onSave: (val: string) => void, multiline?: boolean }) => {
    const isEditing = editingId === id;
    if (isEditing) {
      return multiline ? (
        <textarea autoFocus className={`${className} bg-white/10 ring-2 ring-white/20 rounded-xl p-2 w-full text-white outline-none`}
          value={value} onChange={(e) => onSave(e.target.value)} onBlur={() => setEditingId(null)} />
      ) : (
        <input autoFocus className={`${className} bg-white/10 ring-2 ring-white/20 rounded-xl p-2 w-full text-white outline-none`}
          value={value} onChange={(e) => onSave(e.target.value)} onBlur={() => setEditingId(null)} />
      );
    }
    return (
      <div onDoubleClick={() => setEditingId(id)} className={`${className} cursor-pointer group hover:opacity-80 transition-opacity flex items-center gap-2`}>
        {value} <span className="opacity-0 group-hover:opacity-50 text-[10px]">✎</span>
      </div>
    );
  };

  return (
    <div className="space-y-16 pb-32">
      <div className="bg-white px-12 py-12 rounded-t-[4rem] shadow-sm flex items-center gap-14 border-b border-slate-100">
        <div className="flex items-center gap-12">
           <img src={LOGOS.CORAZON} className="h-28 w-auto object-contain logo-interactivo" alt="Logo SOBSE Corazón" />
           <div className="h-20 w-[1.5px] bg-slate-200" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-[64px] font-[950] text-[#0F172A] uppercase italic leading-none tracking-tighter">
            CEREBRO SOBSE
          </h2>
          <p className="text-[22px] font-black text-guinda uppercase tracking-[0.2em] mt-2 italic opacity-80">
            ARQUITECTURA DE DATOS
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: config.headerBgColor }} className="rounded-[4rem] p-24 text-white shadow-2xl relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl -mr-40 -mt-40" />
        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-4 bg-white/10 px-8 py-3 rounded-full border border-white/10">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
            <EditableText id="topPill" value={config.topPillText || 'AUDITORÍA CDMX'} className="text-[10px] font-black uppercase tracking-widest"
               onSave={(val) => handleUpdate(p => ({...p, topPillText: val}))} />
          </div>
          <EditableText id="dashTitle" value={config.title} className="text-8xl font-[900] tracking-tighter italic uppercase leading-[0.85] drop-shadow-lg"
            onSave={(val) => handleUpdate(p => ({...p, title: val}))} />
          <EditableText id="dashSubtitle" value={config.subtitle} multiline className="text-white/70 text-2xl font-medium italic max-w-3xl leading-relaxed"
            onSave={(val) => handleUpdate(p => ({...p, subtitle: val}))} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 px-2">
        {kpis.map((kpi, i) => {
          const gridSpan = kpi.width === 'full' ? 'col-span-12' : kpi.width === '1/2' ? 'col-span-12 md:col-span-6' : 'col-span-12 md:col-span-3';
          return (
            <div key={i} className={`${gridSpan} bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:translate-y-[-8px] transition-all duration-300 min-h-[220px] relative overflow-hidden`}>
              <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-slate-100 group-hover:bg-guinda transition-colors" style={{ backgroundColor: kpi.statusColor }} />
              <div className="space-y-4 relative z-10">
                <EditableText id={`kpi-label-${i}`} value={kpi.label} className="text-[11px] font-[800] text-slate-400 uppercase tracking-[0.15em] leading-none"
                   onSave={(val) => handleUpdate(p => { const n = [...p.kpis]; n[i].label = val; return {...p, kpis: n}; })} />
                <h4 className="text-5xl font-[900] text-slate-900 tracking-tighter leading-none">{kpi.display}</h4>
              </div>
              {kpi.statusLabel && (
                <div className="bg-slate-50/80 p-4 rounded-[2.5rem] flex items-center gap-4 border border-slate-100 mt-6 group-hover:bg-white transition-colors">
                   <span className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: kpi.statusColor || '#691C32' }} />
                   <EditableText id={`kpi-status-${i}`} value={kpi.statusLabel} className="text-[10px] font-black text-slate-600 uppercase italic tracking-wider"
                     onSave={(val) => handleUpdate(p => { const n = [...p.kpis]; n[i].statusLabel = val; return {...p, kpis: n}; })} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {config.sections.map((sec, sIdx) => (
        <section key={sIdx} className="space-y-12">
          <div className="flex items-center gap-6 px-6 border-b border-slate-200 pb-6">
             <div className="h-12 w-3 bg-guinda rounded-full shadow-lg shadow-guinda/20" />
             <EditableText id={`sec-title-${sIdx}`} value={sec.title} className="text-5xl font-[900] text-slate-900 uppercase italic tracking-tighter"
                onSave={(val) => handleUpdate(p => { const n = [...p.sections]; n[sIdx].title = val; return {...p, sections: n}; })} />
          </div>

          <div className="grid grid-cols-12 gap-10">
            {sec.charts.map((chart, cIdx) => {
              const data = processChartData(chart);
              const isFull = ['timeline', 'tour360', 'webview', 'multiBar', 'line', 'territorial', 'technicalFile', 'investment', 'programFile'].includes(chart.type);
              const span = isFull ? 'col-span-12' : 'col-span-12 lg:col-span-6';
              const dimAlias = getAlias(chart.tableName, chart.dimension);
              const metAlias = getAlias(chart.tableName, chart.metric);

              if (chart.type === 'territorial') {
                const total = data.reduce((acc, d) => acc + d[chart.metric], 0);
                const leader = data[0];
                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm flex flex-col gap-12 group">
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">DISTRIBUCIÓN TERRITORIAL</h4>
                       <h3 className="text-4xl font-[900] text-guinda uppercase italic">{chart.title}</h3>
                       <p className="text-slate-500 text-lg italic">{chart.description}</p>
                    </div>

                    <div className="bg-slate-50/50 p-10 rounded-[3.5rem] border border-slate-100 space-y-8">
                       <div className="flex justify-between items-end">
                          <div className="bg-guinda text-white px-8 py-3 rounded-full text-[11px] font-black uppercase italic shadow-xl">
                             Líder: {leader?.name} · {leader?.[chart.metric].toLocaleString()} {metAlias}
                          </div>
                          <div className="bg-dorado/10 text-dorado border border-dorado/20 px-8 py-3 rounded-full text-[11px] font-black uppercase italic">
                             Total: {total.toLocaleString()} {metAlias}
                          </div>
                       </div>
                       <div className="h-6 bg-slate-200 rounded-full overflow-hidden relative shadow-inner">
                          <div className="h-full bg-guinda transition-all duration-1000 shadow-lg shadow-guinda/20" style={{ width: '100%' }} />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {data.slice(0, 15).map((d, i) => (
                            <div key={i} className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:border-guinda/30 transition-all group/row shadow-sm">
                               <div className="flex items-center gap-4">
                                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-400 group-hover/row:bg-guinda group-hover/row:text-white transition-colors">{i+1}</span>
                                  <span className="text-[12px] font-bold text-slate-600 uppercase italic tracking-tighter truncate max-w-[150px]">{d.name}</span>
                               </div>
                               <span className="text-lg font-black text-guinda tracking-tighter">{d[chart.metric].toLocaleString()} <span className="text-[9px] text-slate-400 font-bold uppercase">{metAlias}</span></span>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                );
              }

              if (chart.type === 'technicalFile') {
                const metricsToUse = [chart.metric, ...(chart.metrics || [])];
                const totals = metricsToUse.map(m => {
                  const val = store[chart.tableName].rows.reduce((acc, r) => {
                    const v = r[m];
                    const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]+/g, "")) || 0;
                    return acc + num;
                  }, 0);
                  return { label: getAlias(chart.tableName, m), value: val };
                });

                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm flex flex-col gap-12">
                    <div className="flex justify-between items-start">
                       <div className="space-y-2">
                          <div className="inline-flex gap-3 items-center">
                             <span className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase">FICHA</span>
                             <h4 className="text-2xl font-[900] text-slate-900 uppercase italic leading-none">{chart.title}</h4>
                          </div>
                          <p className="text-slate-500 italic max-w-3xl leading-relaxed">{chart.description}</p>
                       </div>
                       <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">PROYECTO ACTIVO</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       {totals.map((t, i) => (
                         <div key={i} className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-2 hover:bg-white transition-colors">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.label}</p>
                            <p className="text-4xl font-[900] text-slate-900 tracking-tighter leading-none">{t.value.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-slate-400 italic">Datos acumulados fuente</p>
                         </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="bg-[#691C32]/[0.02] p-10 rounded-[3.5rem] border border-[#691C32]/10 space-y-6">
                          <h5 className="text-[11px] font-black text-guinda uppercase tracking-[0.2em] italic border-b border-guinda/10 pb-4">Objetivos Principales</h5>
                          <ul className="space-y-4">
                             <li className="flex gap-4 items-start group">
                                <span className="text-guinda mt-1 group-hover:scale-110 transition-transform">●</span>
                                <p className="text-slate-600 text-[13px] leading-relaxed">Consolidar el desarrollo de infraestructura de alto impacto mediante el análisis preciso de <b>{dimAlias}</b>.</p>
                             </li>
                             <li className="flex gap-4 items-start group">
                                <span className="text-guinda mt-1 group-hover:scale-110 transition-transform">●</span>
                                <p className="text-slate-600 text-[13px] leading-relaxed">Garantizar la transparencia operativa y física de los proyectos reportados en las bases de datos institucionales.</p>
                             </li>
                             <li className="flex gap-4 items-start group">
                                <span className="text-guinda mt-1 group-hover:scale-110 transition-transform">●</span>
                                <p className="text-slate-600 text-[13px] leading-relaxed">Optimizar la toma de decisiones basada en la distribución de <b>{metAlias}</b> en el territorio.</p>
                             </li>
                          </ul>
                       </div>
                       <div className="bg-slate-50/50 p-10 rounded-[3.5rem] border border-slate-100 space-y-6">
                          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic border-b border-slate-100 pb-4">Lectura Rápida</h5>
                          <div className="space-y-5">
                             <p className="text-slate-700 text-[14px] leading-relaxed">La mayor parte de la intervención se concentra en la categoría de <b>{totals[0]?.label || 'Datos'}</b> con un impacto directo en la productividad sectorial.</p>
                             <p className="text-slate-700 text-[14px] leading-relaxed">El volumen de los indicadores refleja el compromiso con el eje rector del programa de desarrollo urbano.</p>
                             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumen Operativo</p>
                                <p className="text-slate-600 text-[12px] italic">Este tablero permite comparar avances técnicos entre periodos y priorizar tramos críticos para supervisión.</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                );
              }

              if (chart.type === 'investment') {
                const totalMetric = data.reduce((acc, d) => acc + d[chart.metric], 0);
                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm flex flex-col gap-12">
                     <div className="space-y-2">
                        <h4 className="text-3xl font-[950] text-guinda uppercase italic tracking-tighter">Desglose de la inversión</h4>
                        <p className="text-slate-500 italic max-w-2xl leading-relaxed">Distribución de la inversión programada por concepto. Permite identificar rápidamente la concentración de recursos.</p>
                     </div>

                     <div className="space-y-0">
                        <div className="grid grid-cols-12 gap-8 border-b border-slate-100 pb-6 px-4">
                           <div className="col-span-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</div>
                           <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Inversión (MDP)</div>
                           <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Distribución</div>
                        </div>
                        <div className="divide-y divide-slate-50">
                           {data.slice(0, 8).map((d, i) => {
                             const pct = ((d[chart.metric] / (totalMetric || 1)) * 100).toFixed(1);
                             return (
                               <div key={i} className="grid grid-cols-12 gap-8 py-8 px-4 items-center group hover:bg-slate-50/50 transition-colors">
                                  <div className="col-span-6 space-y-1">
                                     <p className="text-lg font-[800] text-slate-900 tracking-tighter uppercase leading-none">{d.name}</p>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase italic">Categoría del Proyecto</p>
                                  </div>
                                  <div className="col-span-3 text-right">
                                     <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{d[chart.metric].toLocaleString()}</p>
                                  </div>
                                  <div className="col-span-3 flex items-center gap-4 justify-end">
                                     <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-guinda/80 group-hover:bg-guinda transition-all" style={{ width: `${pct}%` }} />
                                     </div>
                                     <p className="text-[12px] font-black text-slate-400 w-10 text-right">{pct}%</p>
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                        <div className="grid grid-cols-12 gap-8 pt-8 border-t-2 border-slate-900 px-4 mt-4">
                           <div className="col-span-6">
                              <p className="text-2xl font-[900] text-slate-900 uppercase italic tracking-tighter leading-none">Total Programado</p>
                           </div>
                           <div className="col-span-3 text-right">
                              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{totalMetric.toLocaleString()}</p>
                           </div>
                           <div className="col-span-3 text-right">
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">100% de la inversión</p>
                           </div>
                        </div>
                     </div>
                  </div>
                );
              }

              if (chart.type === 'programFile') {
                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm flex flex-col gap-12">
                     <div className="flex justify-between items-start">
                        <div className="inline-flex items-center gap-4">
                           <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-lg shadow-blue-600/20">FICHA DEL PROGRAMA</span>
                           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">DE REVITALIZACIÓN</h3>
                        </div>
                        <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-8 py-3 rounded-full text-[11px] font-black uppercase italic">Vigencia 2024-2030</div>
                     </div>

                     <div className="space-y-4">
                        <h2 className="text-4xl font-[900] text-guinda uppercase italic tracking-tighter">{chart.title}</h2>
                        <p className="text-slate-500 italic max-w-4xl text-lg leading-relaxed">{chart.description || "Estrategia integral para el desarrollo y fortalecimiento de los núcleos de servicios y convivencia barrial."}</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50/50 p-10 rounded-[3.5rem] border border-slate-100 space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OBJETIVO</p>
                           <p className="text-xl font-[800] text-slate-900 tracking-tight leading-relaxed uppercase">Modernizar espacios públicos y fortalecer su papel como nodos de abasto popular y bienestar social.</p>
                        </div>
                        <div className="bg-slate-50/50 p-10 rounded-[3.5rem] border border-slate-100 space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">COBERTURA</p>
                           <p className="text-xl font-[800] text-slate-900 tracking-tight leading-relaxed uppercase">Presencia en las demarcaciones territoriales con mayor densidad y necesidad de intervención.</p>
                        </div>
                        <div className="bg-slate-50/50 p-10 rounded-[3.5rem] border border-slate-100 space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">COMPONENTES</p>
                           <p className="text-xl font-[800] text-slate-900 tracking-tight leading-relaxed uppercase">Intervenciones físicas, mantenimiento mayor y sistemas de eficiencia energética y captación de lluvia.</p>
                        </div>
                        <div className="bg-slate-50/50 p-10 rounded-[3.5rem] border border-slate-100 space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FINANCIAMIENTO</p>
                           <p className="text-xl font-[800] text-slate-900 tracking-tight leading-relaxed uppercase">Inversión plurianual garantizada mediante el presupuesto de egresos del ejercicio fiscal.</p>
                        </div>
                     </div>

                     <div className="space-y-6 pt-6">
                        <h4 className="text-[11px] font-black text-guinda uppercase tracking-widest border-b border-guinda/10 pb-4">Indicadores Derivados</h4>
                        <ul className="space-y-4">
                           <li className="flex gap-4 items-center group">
                              <span className="w-2.5 h-2.5 rounded-full bg-guinda shadow-lg"></span>
                              <p className="text-slate-600 text-sm font-medium">Incremento sostenido en la calidad de servicios públicos en zonas de alta marginación.</p>
                           </li>
                           <li className="flex gap-4 items-center group">
                              <span className="w-2.5 h-2.5 rounded-full bg-guinda shadow-lg"></span>
                              <p className="text-slate-600 text-sm font-medium">Proyectos estratégicos fortalecen los nodos de abasto metropolitano y cohesión barrial.</p>
                           </li>
                        </ul>
                        <div className="flex flex-wrap gap-4 pt-4">
                           {['#Infraestructura', '#Bienestar', '#Revitalizacion', '#CDMX'].map(tag => (
                             <span key={tag} className="bg-slate-100 text-slate-500 px-6 py-2 rounded-full text-[10px] font-black uppercase">{tag}</span>
                           ))}
                        </div>
                     </div>
                  </div>
                );
              }

              if (chart.type === 'tour360') {
                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center gap-16 overflow-hidden relative group/card">
                    <div className="absolute top-0 left-0 bottom-0 w-3 bg-guinda" />
                    <div className="flex-1 space-y-8">
                       <h4 className="text-5xl font-[900] text-guinda italic tracking-tighter leading-none uppercase">{chart.title}</h4>
                       <p className="text-slate-500 italic max-w-xl text-xl leading-relaxed">{chart.description || "Recorrido virtual interactivo."}</p>
                       <a href={chart.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-4 bg-guinda text-white px-12 py-6 rounded-full font-black uppercase text-[11px] shadow-2xl hover:scale-105 transition-all">Abrir Tour Virtual 360°</a>
                    </div>
                    <div className="w-full lg:w-[600px] aspect-video bg-slate-100 rounded-[3.5rem] overflow-hidden shadow-2xl relative border-[6px] border-white">
                       <iframe src={chart.url} className="w-full h-full border-none" title={chart.title} />
                    </div>
                  </div>
                );
              }

              if (chart.type === 'webview') {
                return (
                  <div key={cIdx} className="col-span-12 bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm h-[700px] flex flex-col group/card">
                    <h4 className="text-3xl font-[900] text-slate-900 uppercase italic mb-8">{chart.title}</h4>
                    <div className="flex-1 rounded-[3rem] overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
                       <iframe src={chart.url} className="w-full h-full border-none" title={chart.title} />
                    </div>
                  </div>
                );
              }

              return (
                <div key={cIdx} className={`${span} bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col group/card hover:border-slate-300 transition-all duration-500 min-h-[550px]`}>
                  <div className="mb-10 flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-3xl font-[900] text-slate-900 uppercase italic tracking-tighter">{chart.title}</h4>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-3 italic opacity-60">Distribución por {dimAlias}</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === 'pie' ? (
                        <PieChart>
                          <Pie data={data} innerRadius={100} outerRadius={140} paddingAngle={8} dataKey={chart.metric} stroke="none">
                            {data.map((_, index) => <Cell key={index} fill={[chart.color, '#006341', '#C5A572', '#1E293B'][index % 4]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip dimensionAlias={dimAlias} metricAlias={metAlias} />} />
                          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '50px' }} />
                        </PieChart>
                      ) : chart.type === 'timeline' ? (
                        <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" fontSize={10} fontWeight="900" width={150} tick={{ fill: '#64748B' }} />
                          <Tooltip formatter={(value: any, name: any, props: any) => {
                            if(name === 'duration') return [new Date(props.payload.end).toLocaleDateString(), 'Fin'];
                            return [new Date(props.payload.start).toLocaleDateString(), 'Inicio'];
                          }} />
                          <Bar dataKey="start" stackId="a" fill="transparent" />
                          <Bar dataKey="duration" stackId="a" fill={chart.color} radius={[10, 10, 10, 10]} barSize={20} />
                        </BarChart>
                      ) : (
                        <BarChart data={data} margin={{ bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={10} fontWeight="900" angle={-35} textAnchor="end" height={60} tick={{ fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8' }} />
                          <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip dimensionAlias={dimAlias} metricAlias={metAlias} />} />
                          <Bar dataKey={chart.metric} fill={chart.color} radius={[12, 12, 0, 0]} barSize={40} name={metAlias} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default DashboardPreview;
