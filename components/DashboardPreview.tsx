
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import { DataRow, DashboardConfig, ColumnMapping } from '../types';
import { SOBSE_THEME } from '../constants';

interface Props {
  data: DataRow[];
  config: DashboardConfig;
  mapping: ColumnMapping;
}

const DashboardPreview: React.FC<Props> = ({ data, config, mapping }) => {
  
  const truncate = (str: string, n: number) => {
    return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
  };

  const processChartData = (dimension: string, metric: string) => {
    const map = new Map();
    data.forEach(row => {
      const cat = String(row[dimension] || 'Sin Dato');
      let val = 0;
      const rawVal = row[metric];

      if (typeof rawVal === 'number') val = rawVal;
      else if (typeof rawVal === 'string') {
        val = parseFloat(rawVal.replace(/[^0-9.-]+/g, "")) || 0;
      }

      if (!map.has(cat)) map.set(cat, { name: cat, value: 0 });
      map.get(cat).value += val;
    });

    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const kpis = useMemo(() => {
    return config.kpis.map(kpi => {
      const target = kpi.key;
      const values = data.map(r => {
        const v = r[target];
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return parseFloat(v.replace(/[^0-9.-]+/g, "")) || 0;
        return 0;
      });
      const total = values.reduce((acc, v) => acc + v, 0);
      const avg = total / (data.length || 1);
      const finalValue = kpi.format === 'percent' ? avg : total;

      const display = kpi.format === 'currency' 
        ? `$${finalValue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}` 
        : kpi.format === 'percent' 
          ? `${finalValue.toFixed(1)}%` 
          : finalValue.toLocaleString('es-MX', { maximumFractionDigits: 0 });

      return { ...kpi, display };
    });
  }, [data, config]);

  return (
    <div className="space-y-20 pb-20">
      {/* Banner de Título Institucional */}
      <div className="bg-slate-900 rounded-[4rem] p-16 md:p-24 text-white shadow-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-guinda/20 rounded-full -mr-20 -mt-20 blur-[100px]" />
        <div className="relative z-10">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Secretaría de Obras y Servicios · CDMX</p>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.85] mb-8">{config.title}</h1>
          <div className="h-1 w-40 bg-guinda rounded-full mb-8"></div>
          <p className="text-slate-400 text-xl md:text-2xl font-medium max-w-3xl opacity-80">{config.subtitle}</p>
        </div>
      </div>

      {/* Tarjetas KPI dinámicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:scale-[1.03] transition-transform duration-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{kpi.label}</p>
            <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{kpi.display}</span>
          </div>
        ))}
      </div>

      {/* Secciones Dinámicas con Grid Adaptable */}
      {config.sections.map((section, sIdx) => (
        <section key={sIdx} className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-end gap-6 px-4">
             <div className="h-14 w-2.5 bg-guinda rounded-full shadow-[0_0_20px_rgba(105,28,50,0.4)]" />
             <div>
               <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">{section.title}</h3>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{section.description}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {section.charts.map((chart, cIdx) => {
              const chartData = processChartData(chart.dimension, chart.metric);
              
              return (
                <div key={cIdx} className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm space-y-8 min-h-[580px] flex flex-col group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2 group-hover:text-guinda transition-colors">{chart.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{chart.dimension} vs {chart.metric}</p>
                    </div>
                  </div>

                  <div className="flex-1 w-full overflow-hidden pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            fontSize={10} 
                            fontWeight="800"
                            tick={{ fill: '#64748b' }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tickFormatter={(val) => truncate(val, 15)}
                          />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="value" fill={chart.color} radius={[12, 12, 0, 0]} barSize={35} />
                        </BarChart>
                      ) : chart.type === 'pie' ? (
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                          <Pie 
                            data={chartData} 
                            innerRadius={90} 
                            outerRadius={140} 
                            paddingAngle={6} 
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((_, index) => (
                              <Cell key={index} fill={[SOBSE_THEME.GUINDA, SOBSE_THEME.VERDE, SOBSE_THEME.DORADO, '#2D2F39', '#475569'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '30px' }} formatter={(val) => truncate(val, 20)} />
                        </PieChart>
                      ) : chart.type === 'line' ? (
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={80} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke={chart.color} strokeWidth={4} dot={{ r: 6, fill: chart.color, strokeWidth: 2, stroke: '#fff' }} />
                        </LineChart>
                      ) : (
                        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={80} />
                          <YAxis hide />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke={chart.color} fill={chart.color} fillOpacity={0.25} strokeWidth={3} />
                        </AreaChart>
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
