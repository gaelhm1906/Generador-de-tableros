
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { TableStore, DashboardConfig, ChartConfig } from '../types';
import { LOGOS, SOBSE_THEME } from '../constants';

interface Props {
  store: TableStore;
  config: DashboardConfig;
  mapping: any;
  onUpdateConfig?: (config: DashboardConfig) => void;
}

const CHART_PALETTE = [
  SOBSE_THEME.GUINDA, 
  SOBSE_THEME.VERDE, 
  SOBSE_THEME.DORADO, 
  '#0F172A', 
  '#475569', 
  '#94A3B8', 
  '#C5A572', 
  '#691C32'
];

const CustomTooltip = ({ active, payload, label, dimensionAlias }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col gap-1 min-w-[280px] animate-in fade-in zoom-in duration-200 z-[100]">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">
          {dimensionAlias}: <span className="text-slate-900">{label}</span>
        </p>
        <div className="space-y-3">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex flex-col gap-0.5">
               <p className="text-2xl font-black tracking-tighter leading-none" style={{ color: p.color }}>
                 {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
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

const EditableText = ({ id, value, className, onSave, multiline = false, isEditing, setEditingId }: any) => {
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
      <span className="leading-[1.1]">{value}</span> 
      <span className="opacity-0 group-hover:opacity-50 text-[10px] shrink-0">✎</span>
    </div>
  );
};

const ChartCard = ({ chart, store, sIdx, cIdx, handleUpdate, editingId, setEditingId }: any) => {
  const table = store[chart.tableName] || Object.values(store)[0];
  
  const chartData = useMemo(() => {
    if (!chart || !chart.tableName) return [];
    const t = store[chart.tableName] || Object.values(store)[0];
    if (!t || !t.rows || t.rows.length === 0) return [];
    
    const rowKeys = Object.keys(t.rows[0]);
    const normalize = (s: string) => s ? s.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "") : "";

    const dimKey = rowKeys.find(k => normalize(k) === normalize(chart.dimension)) || chart.dimension;
    const metKey = rowKeys.find(k => normalize(k) === normalize(chart.metric)) || chart.metric;

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
      
      if (!map.has(cat)) {
        map.set(cat, { name: cat, [chart.metric]: 0 });
      }
      const node = map.get(cat);
      if (node) node[chart.metric] += getVal();
    });

    return Array.from(map.values())
      .sort((a, b) => b[chart.metric] - a[chart.metric])
      .slice(0, 15);
  }, [chart, store]);

  const isSpecial = ['webview', 'tour360', 'technicalFile', 'table'].includes(chart.type);
  const span = isSpecial ? 'col-span-12' : 'col-span-12 lg:col-span-6';
  const dimAlias = table ? (table.columns[chart.dimension]?.alias || chart.dimension) : chart.dimension;
  const metAlias = table ? (table.columns[chart.metric]?.alias || chart.metric) : chart.metric;

  if (chart.type === 'tour360') {
    return (
      <div className="col-span-12 bg-white rounded-[5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col lg:flex-row min-h-[550px] group transition-all hover:shadow-2xl">
        <div className="flex-1 p-20 flex flex-col justify-center space-y-8">
          <span className="bg-guinda/10 text-guinda px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] self-start">VISOR INMERSIVO 360°</span>
          <h4 className="text-5xl font-[950] text-slate-900 uppercase italic tracking-tighter leading-none">{chart.title}</h4>
          <p className="text-slate-500 text-xl font-medium italic opacity-80 leading-relaxed">{chart.description || "Exploración tridimensional interactiva."}</p>
          <a href={chart.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-6 bg-guinda text-white px-12 py-6 rounded-full text-[13px] font-[950] uppercase tracking-widest self-start shadow-xl hover:scale-105 transition-all">🚀 Lanzar Recorrido</a>
        </div>
        <div className="lg:w-[500px] bg-slate-900 flex items-center justify-center relative border-l border-slate-100 overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-guinda/40 to-slate-900 z-10" />
           <div className="relative z-20 text-center space-y-4">
              <span className="text-7xl block animate-pulse">🏛️</span>
              <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.6em]">SOBSE VIRTUAL</p>
           </div>
        </div>
      </div>
    );
  }

  if (chart.type === 'webview') {
    return (
      <div className="col-span-12 space-y-8">
        <div className="bg-slate-100 rounded-[5rem] p-4 shadow-2xl border-4 border-white overflow-hidden">
          <div className="bg-slate-800 px-8 py-4 flex items-center gap-4 border-b border-white/5 rounded-t-[4rem]">
             <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
             </div>
             <div className="bg-black/20 flex-1 rounded-lg px-6 py-1.5 text-[9px] font-bold text-white/30 truncate italic">{chart.url}</div>
          </div>
          <div className="bg-white h-[750px] rounded-b-[4.5rem] relative overflow-hidden">
             <iframe src={chart.url} className="absolute inset-0 w-full h-full border-none" title={chart.title}></iframe>
          </div>
        </div>
      </div>
    );
  }

  if (chart.type === 'technicalFile') {
    const row = table?.rows[0] || {};
    const keys = Object.keys(row).slice(0, 10);
    return (
      <div className="col-span-12 bg-white rounded-[5rem] p-20 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-10">
          <h5 className="text-3xl font-[950] text-guinda uppercase italic border-b-4 border-slate-50 pb-6">RESUMEN EJECUTIVO</h5>
          <div className="space-y-4">
            {keys.slice(0, 6).map((k, i) => (
              <div key={i} className="flex justify-between py-4 border-b border-slate-50">
                <span className="text-[14px] font-black text-slate-400 uppercase italic">{k}</span>
                <span className="text-[16px] font-black text-slate-900 truncate ml-4 max-w-[50%]">{String(row[k] || '---')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-50/50 p-16 rounded-[4.5rem] flex flex-col justify-center space-y-8">
           <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">MÉTRICA DE CONTROL</p>
           <div className="bg-white p-10 rounded-[3rem] shadow-sm text-center">
              <p className="text-5xl font-[950] text-slate-900 tracking-tighter italic">
                 {chartData.reduce((acc, d) => acc + (d[chart.metric] || 0), 0).toLocaleString()}
              </p>
              <p className="text-[11px] font-black text-guinda uppercase mt-3">{chart.metric}</p>
           </div>
        </div>
      </div>
    );
  }

  if (chart.type === 'table') {
    const rows = table?.rows.slice(0, 10) || [];
    const cols = Object.keys(rows[0] || {}).slice(0, 6);
    return (
      <div className="col-span-12 bg-white p-16 rounded-[4.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="mb-10">
          <h4 className="text-[32px] font-[950] text-slate-900 uppercase italic tracking-tighter leading-none">{chart.title}</h4>
          <p className="text-[11px] font-black text-slate-400 uppercase mt-2 italic">Seguimiento detallado de registros</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-slate-50">
                {cols.map(c => <th key={c} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  {cols.map(c => <td key={c} className="px-6 py-4 text-[13px] font-bold text-slate-700">{String(r[c] || '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={`${span} bg-white p-16 rounded-[4.5rem] border border-slate-100 shadow-sm flex flex-col transition-all hover:shadow-2xl`}>
      <div className="mb-10 flex flex-col gap-2">
        <EditableText 
          id={`chart-title-${sIdx}-${cIdx}`} 
          value={chart.title} 
          className="text-[32px] font-[950] text-slate-900 uppercase italic tracking-tighter leading-none"
          isEditing={editingId === `chart-title-${sIdx}-${cIdx}`}
          setEditingId={setEditingId}
          onSave={(val: any) => handleUpdate((p: any) => { p.sections[sIdx].charts[cIdx].title = val; return {...p}; })} 
        />
        <p className="text-[11px] font-[800] text-slate-400 uppercase tracking-[0.15em] italic opacity-60">Fuente: {chart.tableName}</p>
      </div>

      <div className="h-[450px] w-full relative">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === 'pie' ? (
              <PieChart>
                <Pie data={chartData} innerRadius={100} outerRadius={150} paddingAngle={8} dataKey={chart.metric} stroke="none">
                  {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip dimensionAlias={dimAlias} />} />
                <Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '950', textTransform: 'uppercase', paddingTop: '40px' }} />
              </PieChart>
            ) : (
              <BarChart data={chartData} margin={{ bottom: 60, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  fontWeight="900" 
                  angle={-25} 
                  textAnchor="end" 
                  height={100} 
                  tick={{ fill: '#94A3B8' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => val && val.length > 15 ? val.substring(0, 13) + '...' : val}
                />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString() : v} />
                <Tooltip cursor={{fill: 'rgba(15, 23, 42, 0.01)'}} content={<CustomTooltip dimensionAlias={dimAlias} />} />
                <Bar dataKey={chart.metric} radius={[12, 12, 0, 0]} barSize={40} name={metAlias}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                   ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-100 p-8 text-center">
             <span className="text-5xl opacity-20 grayscale mb-4">📊</span>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Sin datos representables</p>
             <p className="text-[10px] text-slate-300 font-medium italic">Selecciona una dimensión y métrica en el panel lateral.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardPreview: React.FC<Props> = ({ store, config, onUpdateConfig }) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleUpdate = (updater: (prev: DashboardConfig) => DashboardConfig) => {
    if (onUpdateConfig) onUpdateConfig(updater(config));
  };

  return (
    <div className="space-y-16 pb-32 max-w-full overflow-x-hidden px-4">
      {/* HEADER INSTITUCIONAL */}
      <div className="bg-white px-12 py-10 rounded-[3.5rem] shadow-sm flex items-center justify-between border border-slate-100">
        <div className="flex items-center gap-12">
           <img src={LOGOS.CDMX} className="h-16 w-auto object-contain logo-interactivo shrink-0" alt="CDMX" />
           <div className="h-12 w-[1px] bg-slate-200 shrink-0" />
           <img src={LOGOS.CORAZON} className="h-20 w-auto object-contain logo-interactivo shrink-0" alt="SOBSE" />
           <div className="flex flex-col ml-4">
              <h2 className="text-[32px] font-[950] text-[#0F172A] uppercase italic leading-none tracking-tighter">
                CEREBRO SOBSE
              </h2>
              <p className="text-[11px] font-black text-guinda uppercase tracking-[0.2em] mt-1 italic opacity-80">
                ARQUITECTURA DE DATOS
              </p>
           </div>
        </div>
      </div>

      {/* BANNER PRINCIPAL */}
      <div style={{ backgroundColor: config.headerBgColor }} className="rounded-[4.5rem] p-20 text-white shadow-2xl relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-4 bg-white/10 px-6 py-2 rounded-full border border-white/10">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
            <EditableText 
              id="topPill" 
              value={config.topPillText || 'MONITOREO ESTRATÉGICO'} 
              className="text-[10px] font-black uppercase tracking-[0.3em]"
              isEditing={editingId === 'topPill'}
              setEditingId={setEditingId}
              onSave={(val: any) => handleUpdate(p => ({...p, topPillText: val}))} 
            />
          </div>
          <EditableText 
            id="dashTitle" 
            value={config.title} 
            className="text-[60px] font-[950] tracking-tighter italic uppercase leading-[0.9] drop-shadow-2xl"
            isEditing={editingId === 'dashTitle'}
            setEditingId={setEditingId}
            onSave={(val: any) => handleUpdate(p => ({...p, title: val}))} 
          />
          <EditableText 
            id="dashSubtitle" 
            value={config.subtitle} 
            multiline 
            className="text-white/70 text-lg font-medium italic max-w-4xl leading-relaxed"
            isEditing={editingId === 'dashSubtitle'}
            setEditingId={setEditingId}
            onSave={(val: any) => handleUpdate(p => ({...p, subtitle: val}))} 
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-12 gap-8">
        {config.kpis.map((kpi, i) => {
          const table = store[kpi.tableName] || Object.values(store)[0];
          if (!table) return null;
          
          const rowKeys = Object.keys(table.rows[0] || {});
          const realKpiKey = rowKeys.find(k => k.trim().toLowerCase() === kpi.key.trim().toLowerCase()) || kpi.key;
          
          const val = table.rows.reduce((acc, r) => {
            const v = r[realKpiKey];
            if (typeof v === 'number') return acc + v;
            if (typeof v === 'string') return acc + (parseFloat(v.replace(/[^0-9.-]+/g, "")) || 0);
            return acc;
          }, 0);
          
          const display = kpi.format === 'currency' ? `$ ${val.toLocaleString()}` : 
                          kpi.format === 'mdp' ? `$ ${(val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MDP` :
                          kpi.format === 'percent' ? `${val.toFixed(2)}%` :
                          val.toLocaleString();

          const gridSpan = kpi.width === 'full' ? 'col-span-12' : kpi.width === '1/2' ? 'col-span-12 md:col-span-6' : 'col-span-12 md:col-span-4';

          return (
            <div key={i} className={`${gridSpan} bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col justify-between group min-h-[220px] relative overflow-hidden transition-all hover:shadow-xl hover:translate-y-[-4px]`}>
              <div className="absolute top-0 left-0 bottom-0 w-3 bg-slate-100 group-hover:bg-guinda transition-colors" style={{ backgroundColor: kpi.statusColor }} />
              <div className="space-y-3 relative z-10 pl-4">
                <EditableText 
                  id={`kpi-l-${i}`} 
                  value={kpi.label} 
                  className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none"
                  isEditing={editingId === `kpi-l-${i}`}
                  setEditingId={setEditingId}
                  onSave={(val: any) => handleUpdate(p => { const n = [...p.kpis]; n[i].label = val; return {...p, kpis: n}; })} 
                />
                <h4 className="text-4xl font-[950] text-slate-900 tracking-tighter leading-none italic">{display}</h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECCIONES */}
      {config.sections.map((sec, sIdx) => (
        <section key={sIdx} className="space-y-12">
          <div className="flex items-center gap-6 px-6 border-b border-slate-200 pb-8">
             <div className="h-10 w-2.5 bg-guinda rounded-full shadow-lg shadow-guinda/20" />
             <EditableText 
              id={`sec-t-${sIdx}`} 
              value={sec.title} 
              className="text-3xl font-[950] text-slate-900 uppercase italic tracking-tighter"
              isEditing={editingId === `sec-t-${sIdx}`}
              setEditingId={setEditingId}
              onSave={(val: any) => handleUpdate(p => { p.sections[sIdx].title = val; return {...p}; })} 
             />
          </div>

          <div className="grid grid-cols-12 gap-12">
            {sec.charts.map((chart, cIdx) => (
              <ChartCard 
                key={chart.id || `c-${sIdx}-${cIdx}`}
                chart={chart}
                store={store}
                sIdx={sIdx}
                cIdx={cIdx}
                handleUpdate={handleUpdate}
                editingId={editingId}
                setEditingId={setEditingId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default DashboardPreview;
