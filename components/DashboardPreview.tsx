
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { DataRow, DashboardConfig, ColumnMapping } from '../types';
import { SOBSE_THEME } from '../constants';

interface Props {
  data: DataRow[];
  config: DashboardConfig;
  mapping: ColumnMapping;
}

const DashboardPreview: React.FC<Props> = ({ data, config, mapping }) => {
  
  // Helper para acortar textos muy largos en los ejes
  const truncate = (str: string, n: number) => {
    return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
  };

  const getMappedColumn = (configKey: string, type: 'dim' | 'met') => {
    if (configKey === 'category' || configKey === mapping.category) return mapping.category;
    if (configKey === 'metric1' || configKey === mapping.metric1) return mapping.metric1;
    if (configKey === 'metric2' || configKey === mapping.metric2) return mapping.metric2;
    if (data.length > 0 && data[0].hasOwnProperty(configKey)) return configKey;
    return type === 'dim' ? mapping.category : mapping.metric1;
  };

  const processChartData = (dimension: string, metric: string) => {
    const dim = getMappedColumn(dimension, 'dim');
    const met = getMappedColumn(metric, 'met');
    
    const map = new Map();
    data.forEach(row => {
      const cat = String(row[dim] || 'Sin Dato');
      let val = 0;
      const rawVal = row[met];

      if (typeof rawVal === 'number') val = rawVal;
      else if (typeof rawVal === 'string') {
        const cleaned = rawVal.replace(/[^0-9.-]+/g, "");
        val = parseFloat(cleaned) || 0;
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
      const target = getMappedColumn(kpi.key, 'met');
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
          : finalValue.toLocaleString();

      return { ...kpi, display, value: finalValue };
    });
  }, [data, mapping, config]);

  return (
    <div className="space-y-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-[#1A1C23] to-guinda rounded-[4rem] p-16 md:p-24 text-white shadow-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -mr-48 -mt-48 blur-[120px]" />
        <div className="relative z-10 max-w-5xl">
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter mb-10 leading-[0.85]">{config.title}</h1>
          <p className="text-slate-300 font-medium text-2xl md:text-3xl opacity-90 leading-relaxed max-w-4xl">{config.subtitle}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{kpi.label}</p>
            <span className="text-4xl font-black text-slate-900 group-hover:text-guinda transition-colors">{kpi.display}</span>
          </div>
        ))}
      </div>

      {/* Dynamic Sections */}
      {config.sections.map((section, sIdx) => (
        <section key={sIdx} className="space-y-10">
          <div className="flex items-center gap-8 px-4">
            <div className="h-12 w-2 bg-guinda rounded-full" />
            <div>
              <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{section.title}</h3>
              <p className="text-lg font-bold text-slate-400">{section.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {section.charts.map((chart, cIdx) => {
              const chartData = processChartData(chart.dimension, chart.metric);
              const isEmpty = chartData.length === 0 || chartData.every(d => d.value === 0);
              
              return (
                <div key={cIdx} className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-8 min-h-[550px] flex flex-col">
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{chart.title}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{chart.description || 'Vista analítica'}</p>
                  </div>

                  <div className="flex-1 w-full overflow-hidden">
                    {!isEmpty ? (
                      <ResponsiveContainer width="100%" height="100%">
                        {chart.type === 'bar' ? (
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 80 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              fontSize={10} 
                              fontWeight="800"
                              tick={{ fill: '#64748b' }}
                              interval={0}
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tickFormatter={(val) => truncate(val, 15)}
                            />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }} />
                            <Bar dataKey="value" fill={chart.color || SOBSE_THEME.GUINDA} radius={[10, 10, 0, 0]} barSize={40} />
                          </BarChart>
                        ) : chart.type === 'pie' ? (
                          /* Fix: Added top, right, and left to margin to satisfy Margin type requirements */
                          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                            <Pie 
                              data={chartData} 
                              innerRadius={80} 
                              outerRadius={130} 
                              paddingAngle={5} 
                              dataKey="value" 
                            >
                              {chartData.map((_, index) => (
                                <Cell key={index} fill={[SOBSE_THEME.GUINDA, SOBSE_THEME.VERDE, SOBSE_THEME.DORADO, '#2D2F39'][index % 4]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} formatter={(val) => truncate(val, 20)} />
                          </PieChart>
                        ) : (
                          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={80} tickFormatter={(val) => truncate(val, 12)} />
                            <YAxis hide />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke={chart.color} fill={chart.color} fillOpacity={0.2} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-xs tracking-widest">Sin datos</div>
                    )}
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
