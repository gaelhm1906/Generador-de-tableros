
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import { TableStore, DashboardConfig, ChartConfig } from '../types';
import { LOGOS, SOBSE_THEME } from '../constants';

interface Props {
  store: TableStore;
  config: DashboardConfig;
  mapping: any;
  onUpdateConfig?: (config: DashboardConfig) => void;
}

const CustomTooltip = ({ active, payload, label, dimensionAlias }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col gap-1 min-w-[240px] animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">
          {dimensionAlias}: <span className="text-slate-900">{label}</span>
        </p>
        <div className="space-y-3">
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
    
    const map = new Map();
    table.rows.forEach(row => {
      const cat = String(row[chart.dimension] || 'Sin Dato');
      const getVal = (m: string) => {
        const val = row[m];
        if (!table.columns[m]?.isMetric) return 1;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;
        return 0;
      };
      
      if (!map.has(cat)) {
        map.set(cat, { name: cat, [chart.metric]: 0 });
      }
      const node = map.get(cat);
      node[chart.metric] += getVal(chart.metric);
      
      if (chart.metrics) {
        chart.metrics.forEach(m => {
          if (!node[m]) node[m] = 0;
          node[m] += getVal(m);
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b[chart.metric] - a[chart.metric])
      .slice(0, 15);
  };

  const EditableText = ({ id, value, className, onSave, multiline = false }: { id: string, value: string, className: string, onSave: (val: string) => void, multiline?: boolean }) => {
    const isEditing = editingId === id;
    if (isEditing) {
      return multiline ? (
        <textarea autoFocus className={`${className} bg-white/10 ring-2 ring-white/20 rounded-xl p-2 w-full text-white outline-none min-h-[80px]`}
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
      {/* HEADER INSTITUCIONAL */}
      <div className="bg-white px-10 py-10 rounded-[3rem] shadow-sm flex items-center gap-10 border border-slate-100">
        <div className="flex items-center gap-8">
           <img src={LOGOS.CDMX} className="h-20 w-auto object-contain logo-interactivo" alt="CDMX" />
           <div className="h-16 w-[1px] bg-slate-200" />
           <img src={LOGOS.CORAZON} className="h-24 w-auto object-contain logo-interactivo" alt="SOBSE" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-[54px] font-[950] text-[#0F172A] uppercase italic leading-none tracking-tighter">
            CEREBRO SOBSE
          </h2>
          <p className="text-[18px] font-black text-guinda uppercase tracking-[0.2em] mt-1 italic opacity-80">
            ARQUITECTURA DE DATOS
          </p>
        </div>
      </div>

      {/* BANNER PRINCIPAL */}
      <div style={{ backgroundColor: config.headerBgColor }} className="rounded-[4rem] p-20 text-white shadow-2xl relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-4 bg-white/10 px-6 py-2 rounded-full border border-white/10">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <EditableText id="topPill" value={config.topPillText || 'MONITOREO ESTRATÉGICO'} className="text-[9px] font-black uppercase tracking-widest"
               onSave={(val) => handleUpdate(p => ({...p, topPillText: val}))} />
          </div>
          <EditableText id="dashTitle" value={config.title} className="text-7xl font-[900] tracking-tighter italic uppercase leading-[0.85] drop-shadow-lg"
            onSave={(val) => handleUpdate(p => ({...p, title: val}))} />
          <EditableText id="dashSubtitle" value={config.subtitle} multiline className="text-white/70 text-xl font-medium italic max-w-2xl leading-relaxed"
            onSave={(val) => handleUpdate(p => ({...p, subtitle: val}))} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-12 gap-8 px-2">
        {config.kpis.map((kpi, i) => {
          const table = store[kpi.tableName];
          if (!table) return null;
          const isNumeric = table.columns[kpi.key]?.isMetric;
          const val = isNumeric 
            ? table.rows.reduce((acc, r) => acc + (typeof r[kpi.key] === 'number' ? r[kpi.key] : parseFloat(String(r[kpi.key]).replace(/[^0-9.-]+/g, "")) || 0), 0)
            : table.rows.length;
          
          const display = kpi.format === 'currency' ? `$ ${val.toLocaleString()}` : 
                          kpi.format === 'mdp' ? `$ ${(val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MDP` :
                          val.toLocaleString();

          const gridSpan = kpi.width === 'full' ? 'col-span-12' : kpi.width === '1/2' ? 'col-span-12 md:col-span-6' : 'col-span-12 md:col-span-6 lg:col-span-4';

          return (
            <div key={i} className={`${gridSpan} bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group min-h-[240px] relative overflow-hidden transition-all hover:shadow-xl`}>
              <div className="absolute top-0 left-0 bottom-0 w-2 bg-slate-100 group-hover:bg-guinda transition-colors" style={{ backgroundColor: kpi.statusColor }} />
              <div className="space-y-4 relative z-10 pl-4">
                <EditableText id={`kpi-l-${i}`} value={kpi.label} className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none"
                   onSave={(val) => handleUpdate(p => { const n = [...p.kpis]; n[i].label = val; return {...p, kpis: n}; })} />
                <h4 className="text-4xl lg:text-5xl font-[900] text-slate-900 tracking-tighter leading-none">{display}</h4>
              </div>
              {kpi.statusLabel && (
                <div className="mt-6 flex items-center gap-3 pl-4">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: kpi.statusColor || '#691C32' }} />
                   <p className="text-[9px] font-black text-slate-400 uppercase italic">{kpi.statusLabel}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SECCIONES Y HERRAMIENTAS */}
      {config.sections.map((sec, sIdx) => (
        <section key={sIdx} className="space-y-12">
          <div className="flex items-center gap-5 px-6 border-b border-slate-200 pb-5">
             <div className="h-10 w-2.5 bg-guinda rounded-full" />
             <EditableText id={`sec-t-${sIdx}`} value={sec.title} className="text-4xl font-[900] text-slate-900 uppercase italic tracking-tighter"
                onSave={(val) => handleUpdate(p => { p.sections[sIdx].title = val; return {...p}; })} />
          </div>

          <div className="grid grid-cols-12 gap-10">
            {sec.charts.map((chart, cIdx) => {
              const table = store[chart.tableName];
              const data = processChartData(chart);
              
              const isWeb = chart.type === 'webview';
              const isTour = chart.type === 'tour360';
              const isTechnicalFile = chart.type === 'technicalFile';
              const isTimeline = chart.type === 'timeline';
              const isProgramFile = chart.type === 'programFile';
              const isCurvaAvance = chart.type === 'line' || chart.type === 'combo';
              const isTechnicalList = ['territorial', 'investment'].includes(chart.type);
              
              const span = (isWeb || isTour || isTimeline || isTechnicalList || isTechnicalFile || isProgramFile || isCurvaAvance) ? 'col-span-12' : 'col-span-12 lg:col-span-6';
              const dimAlias = getAlias(chart.tableName, chart.dimension);
              const metAlias = getAlias(chart.tableName, chart.metric);

              // 1. TOUR 360
              if (isTour) {
                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-2.5 h-full bg-dorado/40 group-hover:bg-guinda transition-colors" />
                     <div className="flex flex-col lg:flex-row items-center gap-16 ml-6">
                        <div className="flex-1 space-y-8">
                           <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">RENDER Y RECORRIDO EN 360°</p>
                              <EditableText id={`ch-t-${sIdx}-${cIdx}`} value={chart.title} className="text-6xl font-[900] text-slate-900 uppercase italic tracking-tighter leading-[0.9]" onSave={(val) => handleUpdate(p => { p.sections[sIdx].charts[cIdx].title = val; return {...p}; })} />
                           </div>
                           <EditableText id={`ch-d-${sIdx}-${cIdx}`} value={chart.description || "Aquí podrás integrar recorridos virtuales, fotografías o videos para mostrar los espacios y su entorno."} multiline className="text-slate-500 text-xl font-medium italic leading-relaxed max-w-2xl" onSave={(val) => handleUpdate(p => { p.sections[sIdx].charts[cIdx].description = val; return {...p}; })} />
                           <div className="flex items-center gap-6">
                              <a href={chart.url} target="_blank" rel="noreferrer" className="bg-guinda text-white px-10 py-5 rounded-full text-[11px] font-[900] uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-guinda/20">
                                 <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">▶</span>
                                 Ver Recorrido 360°
                              </a>
                              <p className="text-[10px] font-bold text-slate-400 uppercase italic">Sustituye este botón por un visor embebido</p>
                           </div>
                        </div>
                        <div className="w-full lg:w-[450px] aspect-[4/3] bg-gradient-to-br from-guinda/80 to-dorado/60 rounded-[3.5rem] flex flex-col items-center justify-center p-12 text-center text-white relative shadow-inner overflow-hidden">
                           <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                           <div className="relative z-10 space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Vista Previa</p>
                              <h5 className="text-3xl font-black italic uppercase tracking-tighter">{chart.title}</h5>
                              <p className="text-[10px] font-medium leading-relaxed opacity-60">Inserta aquí una miniatura o captura del recorrido</p>
                           </div>
                        </div>
                     </div>
                  </div>
                );
              }

              // 2. CURVA DE AVANCE
              if (isCurvaAvance) {
                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[3rem] p-12 shadow-sm border border-slate-100 space-y-10">
                    <div className="space-y-2">
                      <h4 className="text-xl font-[900] text-guinda uppercase tracking-tighter italic">{chart.title}</h4>
                      <p className="text-slate-400 text-sm font-medium italic">{chart.description || "Comportamiento del avance programado, físico real y financiero."}</p>
                    </div>
                    <div className="h-[450px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={10} fontWeight="900" angle={-15} textAnchor="end" height={60} tick={{ fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={(v) => `${v}%`} />
                            <Tooltip content={<CustomTooltip dimensionAlias={dimAlias} />} />
                            <Legend verticalAlign="top" align="center" height={50} iconType="rect" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '20px' }} />
                            <Line name="Meta física programada" type="monotone" dataKey={chart.metric} stroke={SOBSE_THEME.GUINDA} strokeWidth={3} dot={{ r: 4, fill: SOBSE_THEME.GUINDA }} activeDot={{ r: 8 }} />
                            {chart.metrics && chart.metrics[0] && <Line name="Avance físico real" type="monotone" dataKey={chart.metrics[0]} stroke={SOBSE_THEME.VERDE} strokeWidth={3} dot={{ r: 4, fill: SOBSE_THEME.VERDE }} />}
                            {chart.metrics && chart.metrics[1] && <Line name="Avance financiero" type="monotone" dataKey={chart.metrics[1]} stroke={SOBSE_THEME.DORADO} strokeWidth={3} dot={{ r: 4, fill: SOBSE_THEME.DORADO }} />}
                         </LineChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                );
              }

              // 3. LÍNEA DE TIEMPO
              if (isTimeline) {
                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[3rem] p-12 shadow-sm border border-slate-100 space-y-10">
                    <div className="space-y-4">
                      <h4 className="text-xl font-[900] text-guinda uppercase tracking-tighter italic">{chart.title}</h4>
                      <p className="text-slate-400 text-sm font-medium italic max-w-4xl">{chart.description || "Duración contractual proyectada por UTOPÍA."}</p>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rangos Rápidos:</span>
                       {['2024', '2025 - 2026', '2027 - 2028', 'Completo 2024 - 2030'].map(r => (
                          <button key={r} className="px-5 py-2 rounded-full border border-guinda/20 text-guinda text-[10px] font-black uppercase hover:bg-guinda hover:text-white transition-all">{r}</button>
                       ))}
                    </div>

                    <div className="h-[500px] overflow-y-auto pr-4 scrollbar-hide">
                       <ResponsiveContainer width="100%" height={data.length * 60}>
                          <BarChart data={data} layout="vertical" margin={{ left: 100, right: 30 }}>
                             <XAxis type="number" domain={[2024, 2026]} ticks={[2024, 2025, 2026]} tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} />
                             <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} axisLine={false} tickLine={false} />
                             <Tooltip cursor={{ fill: 'transparent' }} />
                             <Bar dataKey={chart.metric} fill={SOBSE_THEME.GUINDA} radius={[0, 8, 8, 0]} barSize={25} />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-500 uppercase">Acercar periodo manual:</span>
                          <input type="date" className="border border-slate-200 rounded-lg p-2 text-[10px]" />
                          <span className="text-slate-400 font-bold">a</span>
                          <input type="date" className="border border-slate-200 rounded-lg p-2 text-[10px]" />
                          <button className="bg-guinda text-white px-6 py-2 rounded-full text-[10px] font-black uppercase">Aplicar</button>
                       </div>
                    </div>
                  </div>
                );
              }

              // 4. FICHA DEL PROGRAMA
              if (isProgramFile) {
                const row = table?.rows[0] || {};
                const badges = [
                  { label: "BARRIDO MANUAL", val: "1,134,970", unit: "km acumulados" },
                  { label: "LAVADO DE SUPERFICIE", val: "5,640,306", unit: "m² acumulados" },
                  { label: "PAPELEO EN ÁREAS VERDES", val: "65,814,492", unit: "m² atendidos", bg: "bg-slate-50" },
                  { label: "BANQUETAS Y GUARNICIONES", val: "+34,0 mil", unit: "m² y m de rehabilitación" }
                ];

                return (
                  <div key={cIdx} className="col-span-12 bg-white rounded-[3.5rem] p-16 shadow-sm border border-slate-100 space-y-12 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                       <div className="space-y-4">
                          <h4 className="text-3xl font-black text-guinda uppercase italic tracking-tighter leading-none">{chart.title}</h4>
                          <p className="text-slate-500 text-lg font-medium italic max-w-4xl">{chart.description || "Programa integral que combina atención de vialidades y servicios urbanos."}</p>
                       </div>
                       <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[11px] font-black uppercase tracking-widest">
                          Servicios urbanos
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                       {badges.map((b, i) => (
                          <div key={i} className={`p-10 rounded-[2.5rem] border border-slate-100 ${b.bg || 'bg-white'} space-y-2`}>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.label}</p>
                             <h5 className="text-3xl font-black text-slate-900 tracking-tighter">{b.val}</h5>
                             <p className="text-[11px] font-bold text-slate-500 italic">{b.unit}</p>
                          </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 pt-8">
                       <div className="space-y-6 bg-slate-50/50 p-12 rounded-[3.5rem] border border-slate-100">
                          <h6 className="text-2xl font-black text-guinda uppercase italic tracking-tighter">Ejes de intervención</h6>
                          <ul className="space-y-4">
                             {[
                               { t: "Limpieza y orden urbano", d: "barrido manual, lavado de superficie y eliminación de grafiti." },
                               { t: "Áreas verdes y parques", d: "mantenimiento integral en red vial primaria." },
                               { t: "Movilidad peatonal", d: "rehabilitación de banquetas y guarniciones." }
                             ].map((item, i) => (
                                <li key={i} className="flex gap-4 items-start">
                                   <span className="w-2 h-2 bg-guinda rounded-full shrink-0 mt-1.5" />
                                   <p className="text-sm text-slate-600 font-medium">
                                      <span className="font-black text-slate-900">{item.t}:</span> {item.d}
                                   </p>
                                </li>
                             ))}
                          </ul>
                       </div>
                       <div className="space-y-6 p-4">
                          <h6 className="text-2xl font-black text-guinda uppercase italic tracking-tighter">Resultados destacados</h6>
                          <ul className="space-y-6">
                             {[
                               "Más de 28 millones de m² de áreas verdes atendidas.",
                               "Operación intensa de residuos: casi 2.9 millones de toneladas canalizadas.",
                               "Más de 189 mil luminarias intervenidas para reforzar seguridad."
                             ].map((txt, i) => (
                                <li key={i} className="flex gap-4 items-start">
                                   <span className="w-2 h-2 bg-guinda rounded-full shrink-0 mt-1.5" />
                                   <p className="text-sm text-slate-600 font-medium leading-relaxed">{txt}</p>
                                </li>
                             ))}
                          </ul>
                       </div>
                    </div>
                  </div>
                );
              }

              // 5. FICHA TÉCNICA (DETALLE DEL PROYECTO)
              if (isTechnicalFile) {
                const row = table?.rows[0] || {};
                const keys = Object.keys(row).slice(0, 5);
                const cardsKeys = Object.keys(row).slice(5, 9);
                
                return (
                  <div key={cIdx} className="col-span-12 space-y-8">
                    <div className="flex items-center gap-4">
                       <h4 className="text-[12px] font-black text-slate-600 uppercase tracking-widest italic border-b-2 border-guinda/30 pb-1">DETALLE DEL PROYECTO</h4>
                    </div>
                    <div className="bg-white rounded-[4rem] p-16 shadow-sm border border-slate-100 grid grid-cols-12 gap-16 relative">
                       <div className="col-span-12 lg:col-span-6 space-y-8">
                          <h5 className="text-2xl font-black text-guinda uppercase italic tracking-tighter border-b border-slate-100 pb-4">Características Principales</h5>
                          <div className="space-y-4">
                             {keys.map((k, i) => (
                                <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 group hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                                   <span className="text-[14px] font-[800] text-slate-600 uppercase italic tracking-tight">{getAlias(chart.tableName, k)}</span>
                                   <span className="text-[14px] font-bold text-slate-900">{String(row[k] || 'N/A')}</span>
                                </div>
                             ))}
                             <div className="flex justify-between items-center py-4 border-t-2 border-slate-100 mt-4 px-2">
                                <span className="text-[15px] font-black text-slate-800 uppercase italic">Inversión Aprox.</span>
                                <span className="text-[18px] font-black text-slate-900">$ {data.reduce((acc, d) => acc + (d[chart.metric] || 0), 0).toLocaleString()}</span>
                             </div>
                          </div>
                       </div>
                       <div className="col-span-12 lg:col-span-6 space-y-12">
                          <div className="space-y-6">
                             <h5 className="text-2xl font-black text-guinda uppercase italic tracking-tighter">Ficha Técnica del Proyecto</h5>
                             <div className="grid grid-cols-2 gap-6">
                                {cardsKeys.map((k, i) => (
                                   <div key={i} className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100 space-y-2 hover:bg-white transition-all shadow-sm">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getAlias(chart.tableName, k)}</p>
                                      <p className="text-[15px] font-black text-slate-800 italic uppercase leading-tight tracking-tighter">{String(row[k] || 'Info')}</p>
                                   </div>
                                ))}
                             </div>
                          </div>
                          <div className="space-y-4">
                             <h5 className="text-xl font-black text-guinda uppercase italic tracking-tighter">Objetivos Clave</h5>
                             <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-slate-500 text-[13px] font-medium leading-relaxed">
                                   <span className="w-1.5 h-1.5 bg-guinda rounded-full" />
                                   Optimizar la infraestructura para el beneficio ciudadano.
                                </li>
                                <li className="flex items-center gap-3 text-slate-500 text-[13px] font-medium leading-relaxed">
                                   <span className="w-1.5 h-1.5 bg-guinda rounded-full" />
                                   Garantizar una movilidad eficiente y sostenible.
                                </li>
                             </ul>
                          </div>
                       </div>
                    </div>
                  </div>
                );
              }

              // 6. VISOR WEB
              if (isWeb) {
                return (
                  <div key={cIdx} className="col-span-12 bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col min-h-[850px]">
                    <div className="mb-8 flex justify-between items-start">
                       <div>
                          <EditableText id={`ch-t-${sIdx}-${cIdx}`} value={chart.title} className="text-4xl font-[900] text-slate-900 uppercase italic tracking-tighter" onSave={(val) => handleUpdate(p => { p.sections[sIdx].charts[cIdx].title = val; return {...p}; })} />
                       </div>
                       <a href={chart.url} target="_blank" rel="noreferrer" className="bg-slate-900 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase hover:scale-105 transition-all shadow-xl">Abrir ↗</a>
                    </div>
                    <iframe src={chart.url} className="flex-1 rounded-[3.5rem] border-none bg-slate-50" title={chart.title} allowFullScreen />
                  </div>
                );
              }

              // 7. GRÁFICOS TRADICIONALES
              return (
                <div key={cIdx} className={`${span} bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col min-h-[550px] transition-all hover:shadow-lg`}>
                  <div className="mb-10 flex flex-col gap-2">
                    <EditableText id={`chart-title-${sIdx}-${cIdx}`} value={chart.title} className="text-3xl font-[900] text-slate-900 uppercase italic tracking-tighter"
                      onSave={(val) => handleUpdate(p => { p.sections[sIdx].charts[cIdx].title = val; return {...p}; })} />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic opacity-60">Visualizando por {dimAlias}</p>
                  </div>
                  <div className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === 'pie' ? (
                        <PieChart>
                          <Pie data={data} innerRadius={90} outerRadius={130} paddingAngle={8} dataKey={chart.metric} stroke="none">
                            {data.map((_, index) => <Cell key={index} fill={[chart.color, '#006341', '#C5A572', '#1E293B'][index % 4]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip dimensionAlias={dimAlias} />} />
                          <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '40px' }} />
                        </PieChart>
                      ) : (
                        <BarChart data={data} margin={{ bottom: 40, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={10} fontWeight="900" angle={-35} textAnchor="end" height={70} tick={{ fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={(v) => v.toLocaleString()} />
                          <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip dimensionAlias={dimAlias} />} />
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
