import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie, Legend
} from 'recharts';
import { DataRow, DashboardConfig, ColumnMapping } from '../types';
import { SOBSE_THEME } from '../constants';

interface Props {
  data: DataRow[];
  config: DashboardConfig;
  mapping: ColumnMapping;
}

const DashboardPreview: React.FC<Props> = ({ data, config, mapping }) => {
  // Procesar datos basados en el mapeo activo
  const chartData = useMemo(() => {
    const map = new Map();
    data.forEach(row => {
      const cat = String(row[mapping.category] || 'N/A');
      const val1 = Number(row[mapping.metric1]) || 0;
      const val2 = Number(row[mapping.metric2]) || 0;
      
      if (!map.has(cat)) {
        map.set(cat, { name: cat, m1: 0, m2: 0, count: 0 });
      }
      const entry = map.get(cat);
      entry.m1 += val1;
      entry.m2 += val2;
      entry.count += 1;
    });

    // Devolver top 10 por métrica 1
    return Array.from(map.values())
      .sort((a, b) => b.m1 - a.m1)
      .slice(0, 10);
  }, [data, mapping]);

  const kpis = useMemo(() => {
    return config.kpis.map(kpi => {
      // Intentar encontrar el total si la métrica existe
      const targetKey = mapping[kpi.key as keyof ColumnMapping] || kpi.key;
      const total = data.reduce((acc, row) => acc + (Number(row[targetKey]) || 0), 0);
      const avg = total / data.length;
      const finalValue = kpi.format === 'percent' ? avg : total;
      
      let display = finalValue.toLocaleString();
      if (kpi.format === 'currency') display = `$${finalValue.toLocaleString()}`;
      if (kpi.format === 'percent') display = `${finalValue.toFixed(1)}%`;
      
      return { ...kpi, display };
    });
  }, [data, config, mapping]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-1000">
      {/* Header del Tablero */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">{config.title}</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">{config.subtitle}</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase">Muestreo</p>
            <p className="text-sm font-bold text-slate-900">{data.length} Filas</p>
          </div>
          <div className="px-4 py-2 bg-guinda text-white rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-black opacity-60 uppercase">Estado</p>
            <p className="text-sm font-bold uppercase tracking-widest text-[10px]">Actualizado</p>
          </div>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
            <div 
              className="absolute left-0 top-0 bottom-0 w-1.5" 
              style={{ backgroundColor: i % 3 === 0 ? SOBSE_THEME.GUINDA : i % 3 === 1 ? SOBSE_THEME.VERDE : SOBSE_THEME.DORADO }} 
            />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{kpi.display}</p>
            <div className="mt-4 flex items-center gap-2">
               <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                 <div className="h-full bg-slate-300 w-2/3" />
               </div>
               <span className="text-[9px] font-bold text-slate-400 uppercase">Salud Óptima</span>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfica 1: Barras Comparativas */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-guinda" />
              Comparativa por {mapping.category}
            </h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v.toLocaleString()} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar name={mapping.metric1} dataKey="m1" fill={SOBSE_THEME.GUINDA} radius={[6, 6, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Tendencia o Área */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-dorado" />
              Distribución de {mapping.metric2}
            </h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorM2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SOBSE_THEME.DORADO} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={SOBSE_THEME.DORADO} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" name={mapping.metric2} dataKey="m2" stroke={SOBSE_THEME.DORADO} strokeWidth={3} fillOpacity={1} fill="url(#colorM2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla de Resumen Final */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Resumen de Ejecución Top 10</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{mapping.category}</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{mapping.metric1}</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{mapping.metric2}</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Desempeño</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-sm font-bold text-slate-800">{row.name}</td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">{row.m1.toLocaleString()}</td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">{row.m2.toLocaleString()}</td>
                  <td className="px-8 py-5 text-center">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse ${i < 3 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="pt-12 pb-8 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">SOBSE · Inteligencia Visual CDMX © 2024</p>
      </footer>
    </div>
  );
};

export default DashboardPreview;