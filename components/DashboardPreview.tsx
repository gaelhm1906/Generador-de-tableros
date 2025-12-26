
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, Line, ComposedChart, AreaChart, Area
} from 'recharts';
import { TableStore, DashboardConfig, ColumnMapping } from '../types';
import { LOGOS } from '../constants';

interface Props {
  store: TableStore;
  config: DashboardConfig;
  mapping: ColumnMapping;
}

const DashboardPreview: React.FC<Props> = ({ store, config }) => {
  const getAlias = (tableName: string, colName: string) => store[tableName]?.columns[colName]?.alias || colName;

  const processChartData = (tableName: string, dimension: string, metric: string, metric2?: string) => {
    const table = store[tableName];
    if (!table) return [];
    const map = new Map();
    table.rows.forEach(row => {
      const cat = String(row[dimension] || 'Sin Dato');
      const getVal = (m: string) => {
        const rv = row[m];
        if (typeof rv === 'number') return rv;
        if (typeof rv === 'string') return parseFloat(rv.replace(/[^0-9.-]+/g, "")) || 0;
        return 0;
      };
      if (!map.has(cat)) map.set(cat, { name: cat, value: 0, value2: 0 });
      map.get(cat).value += getVal(metric);
      if(metric2) map.get(cat).value2 += getVal(metric2);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 10);
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
      if (kpi.format === 'currency') display = `$${val.toLocaleString()}`;
      else if (kpi.format === 'mdp') display = `$ ${(val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MDP`;
      else if (kpi.format === 'percent') display = `${val.toFixed(1)}%`;
      else display = val.toLocaleString();

      return { ...kpi, display };
    });
  }, [store, config]);

  return (
    <div className="space-y-12 pb-32">
      <div className="bg-white px-10 py-6 rounded-t-[3rem] shadow-sm flex justify-between items-center border-b border-slate-100">
        <div className="flex items-center gap-6">
          <img src={LOGOS.CORAZON} className="h-14 w-auto" alt="Logo" />
          <div className="h-8 w-[1px] bg-slate-200" />
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Secretaría de Obras y Servicios</p>
            <h2 className="text-[16px] font-[900] text-[#0F172A] uppercase italic leading-none">Cerebro de Datos SOBSE</h2>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: config.headerBgColor }} className="rounded-[4rem] p-20 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full border border-white/10">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">Auditoría Institucional CDMX</span>
          </div>
          <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-none">{config.title}</h1>
          <p className="text-white/70 text-xl font-medium italic max-w-2xl">{config.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:translate-y-[-5px] transition-all min-h-[220px]">
             <div className="space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
               <h4 className="text-4xl font-black text-slate-900 tracking-tighter group-hover:text-guinda transition-colors">{kpi.display}</h4>
             </div>
             {kpi.statusLabel && (
               <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center gap-2.5 border border-slate-100 mt-4">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: kpi.statusColor || '#691C32' }} />
                  <span className="text-[9px] font-black text-slate-500 uppercase">{kpi.statusLabel}</span>
               </div>
             )}
          </div>
        ))}
      </div>

      {config.sections.map((sec, sIdx) => (
        <section key={sIdx} className="space-y-10">
          <div className="flex items-center gap-5 px-4 border-b border-slate-200 pb-4">
             <div className="h-10 w-2.5 bg-guinda rounded-full" />
             <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">{sec.title}</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {sec.charts.map((chart, cIdx) => {
              if (chart.type === 'tour360') {
                return (
                  <div key={cIdx} className="lg:col-span-2 bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
                    <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-guinda" />
                    <div className="flex-1 space-y-8">
                       <h4 className="text-4xl font-black text-[#691C32] italic tracking-tighter leading-none">{chart.title}</h4>
                       <p className="text-slate-500 italic max-w-md">Exploración visual 360° y renders arquitectónicos de alta definición.</p>
                       <a href={chart.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-4 bg-guinda text-white px-8 py-4 rounded-full font-black uppercase text-xs shadow-xl hover:scale-105 transition-all">Ver recorrido 360°</a>
                    </div>
                    <div className="w-full md:w-[400px] aspect-video bg-slate-50 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                       <img src={chart.previewUrl || 'https://via.placeholder.com/600x400'} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" alt="Preview" />
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/10 transition-opacity">
                         <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-[8px] font-black uppercase text-guinda">Previsualización</div>
                       </div>
                    </div>
                  </div>
                );
              }

              if (chart.type === 'webview') {
                return (
                  <div key={cIdx} className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm h-[600px] flex flex-col">
                    <div className="mb-8">
                      <h4 className="text-xl font-black text-slate-900 uppercase italic leading-none">{chart.title}</h4>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-2">Seguimiento Web Integrado</p>
                    </div>
                    <div className="flex-1 rounded-[2.5rem] overflow-hidden border border-slate-100 bg-slate-50">
                       <iframe src={chart.url} className="w-full h-full border-none" title={chart.title} />
                    </div>
                  </div>
                );
              }

              const data = processChartData(chart.tableName, chart.dimension, chart.metric, chart.metricLine);
              const m1Label = getAlias(chart.tableName, chart.metric);
              const m2Label = chart.metricLine ? getAlias(chart.tableName, chart.metricLine) : '';

              return (
                <div key={cIdx} className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col h-[550px]">
                  <div className="mb-8">
                    <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{chart.title}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Distribución por {getAlias(chart.tableName, chart.dimension)}</p>
                  </div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === 'combo' ? (
                        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={9} fontWeight="bold" angle={-45} textAnchor="end" height={50} tick={{ fill: '#94A3B8' }} />
                          <YAxis fontSize={9} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="value" fill={chart.color} radius={[8, 8, 0, 0]} barSize={35} name={m1Label} />
                          {chart.metricLine && <Line type="monotone" dataKey="value2" stroke={chart.color2 || '#C5A572'} strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} name={m2Label} />}
                        </ComposedChart>
                      ) : chart.type === 'pie' ? (
                        <PieChart>
                          <Pie data={data} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                            {data.map((_, index) => <Cell key={index} fill={[chart.color, '#006341', '#C5A572', '#1E293B'][index % 4]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                        </PieChart>
                      ) : chart.type === 'area' ? (
                        <AreaChart data={data} margin={{ bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={9} fontWeight="bold" angle={-45} textAnchor="end" height={50} />
                          <YAxis fontSize={9} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke={chart.color} fill={chart.color} fillOpacity={0.1} strokeWidth={4} name={m1Label} />
                        </AreaChart>
                      ) : (
                        <BarChart data={data} margin={{ bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={9} fontWeight="bold" angle={-45} textAnchor="end" height={50} tick={{ fill: '#94A3B8' }} />
                          <YAxis fontSize={9} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill={chart.color} radius={[8, 8, 0, 0]} barSize={40} name={m1Label} />
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
