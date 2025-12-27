
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
    return Array.from(map.values()).sort((a, b) => (b[chart.metric] || 0) - (a[chart.metric] || 0)).slice(0, 10);
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
      {/* HEADER INSTITUCIONAL: LOGO IZQUIERDA + TEXTO MONUMENTAL */}
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
              const isFull = ['timeline', 'tour360', 'webview', 'multiBar', 'line'].includes(chart.type);
              const span = isFull ? 'col-span-12' : 'col-span-12 lg:col-span-6';
              const dimAlias = getAlias(chart.tableName, chart.dimension);
              const metAlias = getAlias(chart.tableName, chart.metric);

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
                          {/* CORRECCIÓN: dataKey usa chart.metric para asegurar que se muestren los datos */}
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
