
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DataRow, TableStore, ColumnMetadata, DashboardConfig, ChartConfig, KPIConfig, DashboardSection } from './types';
import { analyzeMultiTableData } from './services/localAnalysisService';
import { analyzeDataWithAI } from './services/geminiService';
import { LOGOS, SOBSE_THEME } from './constants';
import DashboardPreview from './components/DashboardPreview';
import { generateExportableHtml } from './utils/exportUtils';

const BRAIN_MEMORY_KEY = 'sobse_brain_history';

const App: React.FC = () => {
  const [store, setStore] = useState<TableStore>({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'table'>('table');
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [editableConfig, setEditableConfig] = useState<DashboardConfig | null>(null);
  const [brainHistory, setBrainHistory] = useState<DashboardConfig[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(BRAIN_MEMORY_KEY);
    if (saved) {
      try { setBrainHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const getColumnMetadata = (rows: DataRow[]): { [key: string]: ColumnMetadata } => {
    const cols: { [key: string]: ColumnMetadata } = {};
    if (rows.length === 0) return cols;
    const keys = Object.keys(rows[0]);
    keys.forEach(key => {
      const values = rows.slice(0, 50).map(r => r[key]);
      const uniqueValues = new Set(values).size;
      const isNumeric = values.every(v => v === null || v === undefined || !isNaN(parseFloat(String(v).replace(/[^0-9.-]+/g, ""))));
      const isDate = values.every(v => v === null || v === undefined || !isNaN(Date.parse(String(v))));
      cols[key] = {
        name: key, alias: key,
        type: isNumeric ? 'number' : (isDate ? 'date' : 'text'),
        uniqueRatio: uniqueValues / 50,
        isMetric: isNumeric,
        isDimension: !isNumeric && !isDate && uniqueValues > 1,
        scoreTags: []
      };
    });
    return cols;
  };

  const processFiles = async (files: FileList) => {
    setLoading(true);
    const newStore: TableStore = { ...store };
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer);
        wb.SheetNames.forEach(name => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name]) as DataRow[];
          if (rows.length > 0) {
            const tableName = `${file.name} - ${name}`;
            newStore[tableName] = { rows, columns: getColumnMetadata(rows) };
          }
        });
      } catch (err) { console.error(err); }
    }
    setStore(newStore);
    if (Object.keys(newStore).length > 0) setSelectedTable(Object.keys(newStore)[0]);
    setLoading(false);
  };

  const startAnalysis = async () => {
    setLoading(true);
    try {
      const mainTableName = Object.keys(store)[0];
      const data = store[mainTableName].rows;
      const result = await analyzeDataWithAI(data, brainHistory);
      setEditableConfig({ ...result.suggestedConfig, headerBgColor: '#0F172A' });
      setView('dashboard');
    } catch (e) {
      console.error(e);
      const result = analyzeMultiTableData(store);
      setEditableConfig({ ...result.suggestedConfig, headerBgColor: '#0F172A' });
      setView('dashboard');
    }
    setLoading(false);
  };

  // --- CRUD INDICADORES (KPIs) ---
  const addKPI = () => {
    if (!editableConfig || Object.keys(store).length === 0) return;
    const tableName = Object.keys(store)[0];
    const cols = Object.keys(store[tableName]?.columns || {});
    const newKPI: KPIConfig = {
      label: "NUEVO INDICADOR",
      tableName,
      key: cols.find(c => store[tableName].columns[c].isMetric) || cols[0] || "",
      format: 'number',
      statusColor: SOBSE_THEME.GUINDA,
      width: '1/4'
    };
    setEditableConfig({ ...editableConfig, kpis: [...editableConfig.kpis, newKPI] });
  };

  const updateKPI = (idx: number, fields: Partial<KPIConfig>) => {
    if (!editableConfig) return;
    const newKpis = [...editableConfig.kpis];
    const currentKpi = newKpis[idx];
    
    // Si cambia la tabla, forzar la selección de la primera columna válida de esa nueva tabla
    if (fields.tableName && fields.tableName !== currentKpi.tableName) {
      const availableCols = Object.keys(store[fields.tableName]?.columns || {});
      fields.key = availableCols[0] || "";
    }

    newKpis[idx] = { ...currentKpi, ...fields };
    setEditableConfig({ ...editableConfig, kpis: newKpis });
  };

  const removeKPI = (idx: number) => {
    if (!editableConfig) return;
    const kpis = [...editableConfig.kpis];
    kpis.splice(idx, 1);
    setEditableConfig({ ...editableConfig, kpis });
  };

  // --- CRUD SECCIONES Y GRÁFICAS ---
  const addSection = () => {
    if (!editableConfig) return;
    const newSection: DashboardSection = {
      title: "NUEVA SECCIÓN",
      description: "Descripción de la sección",
      charts: []
    };
    setEditableConfig({ ...editableConfig, sections: [...editableConfig.sections, newSection] });
  };

  const removeSection = (sIdx: number) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections.splice(sIdx, 1);
    setEditableConfig({ ...editableConfig, sections });
  };

  const addChart = (sIdx: number, type: ChartConfig['type'] = 'bar') => {
    if (!editableConfig || Object.keys(store).length === 0) return;
    const sections = [...editableConfig.sections];
    const tableName = Object.keys(store)[0];
    const cols = Object.keys(store[tableName]?.columns || {});
    
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      type,
      tableName,
      title: type === 'technicalFile' ? "Ficha Técnica" : (type === 'table' ? "Tabla de Detalle" : "Análisis de Datos"),
      dimension: cols[0] || "",
      metric: cols.find(c => store[tableName].columns[c].isMetric) || cols[0] || "",
      color: SOBSE_THEME.GUINDA,
      description: ""
    };
    
    sections[sIdx].charts.push(newChart);
    setEditableConfig({ ...editableConfig, sections });
  };

  const removeChart = (sIdx: number, cIdx: number) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections[sIdx].charts.splice(cIdx, 1);
    setEditableConfig({ ...editableConfig, sections });
  };

  const updateChart = (sIdx: number, cIdx: number, fields: Partial<ChartConfig>) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections[sIdx].charts[cIdx] = { ...sections[sIdx].charts[cIdx], ...fields };
    setEditableConfig({ ...editableConfig, sections });
  };

  const inputBase = "bg-[#15181E] border border-white/10 text-white text-[10px] p-3 rounded-xl outline-none focus:border-dorado transition-all w-full font-bold";
  // Ajuste en selectStyle para evitar texto blanco sobre fondo blanco en el menú desplegable nativo
  const selectStyle = "bg-[#15181E] border border-white/10 text-white text-[10px] p-3 rounded-xl outline-none focus:border-dorado transition-all w-full font-bold cursor-pointer hover:bg-[#1C2129]";

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="w-[420px] bg-[#0F1115] text-white flex flex-col shadow-2xl z-40 border-r border-white/5">
        <div className="p-8 bg-white border-b border-slate-200 flex items-center gap-3">
          <img src={LOGOS.CORAZON} alt="SOBSE" className="h-10 w-auto" />
          <div>
            <h1 className="text-[12px] font-[950] uppercase text-slate-900 leading-tight italic">Cerebro SOBSE</h1>
            <p className="text-[8px] font-black text-guinda uppercase tracking-widest opacity-60 italic">Arquitectura de Datos</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-8 space-y-10">
          {!editableConfig ? (
            <div className="space-y-6 animate-in fade-in">
              <label className="group block w-full p-10 border-2 border-dashed border-white/10 rounded-[3rem] hover:border-guinda/50 hover:bg-white/[0.02] transition-all text-center cursor-pointer">
                <span className="text-4xl block mb-4">📂</span>
                <span className="text-[11px] font-black uppercase text-slate-300 tracking-widest italic">Vincular Dataset</span>
                <input type="file" className="hidden" multiple onChange={e => e.target.files && processFiles(e.target.files)} />
              </label>
              <div className="space-y-2">
                {Object.keys(store).map(name => (
                  <button key={name} onClick={() => setSelectedTable(name)} className={`w-full text-left px-6 py-4 rounded-3xl text-[9px] font-black border uppercase transition-all ${selectedTable === name ? 'bg-guinda border-guinda text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                    {name}
                  </button>
                ))}
              </div>
              {Object.keys(store).length > 0 && (
                <button onClick={startAnalysis} className="w-full py-5 bg-guinda text-white font-[950] uppercase text-[11px] rounded-full shadow-2xl hover:scale-105 transition-all">🚀 Generar Tablero Inteligente</button>
              )}
            </div>
          ) : (
            <div className="space-y-12 pb-24 animate-in fade-in">
              {/* SECCIÓN DE INDICADORES (KPIs) */}
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Indicadores (Cards)</h4>
                  <button onClick={addKPI} className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-3 py-1 rounded-full">+ INDICADOR</button>
                </div>
                <div className="space-y-4">
                  {editableConfig.kpis.map((kpi, kIdx) => {
                    const availableCols = Object.keys(store[kpi.tableName]?.columns || {});
                    return (
                      <div key={`edit-kpi-${kIdx}`} className="bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5 space-y-4 relative group">
                        <button onClick={() => removeKPI(kIdx)} className="absolute top-4 right-4 text-white/20 hover:text-white text-lg transition-colors">×</button>
                        
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-widest opacity-60">Etiqueta de la Card</label>
                          <input value={kpi.label} onChange={e => updateKPI(kIdx, {label: e.target.value})} className={inputBase} placeholder="Ej. Total de Proyectos" />
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-widest opacity-60">Origen (Tabla)</label>
                            <select value={kpi.tableName} onChange={e => updateKPI(kIdx, {tableName: e.target.value})} className={selectStyle}>
                               {Object.keys(store).map(name => <option key={name} value={name} className="bg-[#15181E] text-white">{name}</option>)}
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-widest opacity-60">Columna de Datos</label>
                              <select 
                                value={kpi.key} 
                                onChange={e => updateKPI(kIdx, {key: e.target.value})} 
                                className={selectStyle}
                              >
                                 <option value="" disabled className="text-slate-500">Seleccionar...</option>
                                 {availableCols.map(c => <option key={c} value={c} className="bg-[#15181E] text-white">{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-widest opacity-60">Formato Visual</label>
                              <select value={kpi.format} onChange={e => updateKPI(kIdx, {format: e.target.value as any})} className={selectStyle}>
                                 <option value="number" className="bg-[#15181E] text-white">Numérico</option>
                                 <option value="currency" className="bg-[#15181E] text-white">Moneda ($)</option>
                                 <option value="percent" className="bg-[#15181E] text-white">Porcentaje (%)</option>
                                 <option value="mdp" className="bg-[#15181E] text-white">MDP (Millones)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECCIÓN DE CONTENIDO */}
              <div className="space-y-6 border-t border-white/5 pt-8">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Estructura del Contenido</h4>
                  <button onClick={addSection} className="text-[9px] font-black text-dorado uppercase bg-dorado/10 px-3 py-1 rounded-full">+ SECCIÓN</button>
                </div>

                {editableConfig.sections.map((sec, sIdx) => (
                  <div key={`edit-sec-${sIdx}`} className="space-y-6 bg-white/[0.02] p-6 rounded-[3rem] border border-white/5 relative group">
                    <button onClick={() => removeSection(sIdx)} className="absolute -top-2 -right-2 w-8 h-8 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs font-bold border border-red-500/30">×</button>
                    
                    <div className="px-2 space-y-2">
                      <input 
                        value={sec.title} 
                        onChange={e => {
                          const newSections = [...editableConfig.sections];
                          newSections[sIdx].title = e.target.value;
                          setEditableConfig({...editableConfig, sections: newSections});
                        }}
                        className="bg-transparent text-[11px] font-[950] text-white uppercase outline-none w-full italic border-b border-white/10 pb-2"
                        placeholder="TÍTULO DE SECCIÓN"
                      />
                    </div>

                    <div className="space-y-4">
                      {sec.charts.map((chart, cIdx) => (
                        <div key={chart.id || `edit-chart-${sIdx}-${cIdx}`} className="bg-[#15181E] p-6 rounded-[2.5rem] border border-white/10 space-y-5 relative group/card">
                          <button onClick={() => removeChart(sIdx, cIdx)} className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors text-xl font-light">×</button>
                          
                          <div className="flex items-center gap-3">
                              <input type="color" value={chart.color} onChange={e => updateChart(sIdx, cIdx, {color: e.target.value})} className="w-5 h-5 rounded-full cursor-pointer bg-transparent" />
                              <input value={chart.title} onChange={e => updateChart(sIdx, cIdx, {title: e.target.value})} className="bg-transparent text-[11px] font-[950] text-white uppercase outline-none w-full italic" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[8px] font-black text-slate-500 uppercase ml-1 tracking-widest opacity-60">Eje X (Categoría)</label>
                                <select value={chart.dimension} onChange={e => updateChart(sIdx, cIdx, {dimension: e.target.value})} className={selectStyle}>
                                    {Object.keys(store[chart.tableName]?.columns || {}).map(c => <option key={c} value={c} className="bg-[#15181E] text-white">{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] font-black text-slate-500 uppercase ml-1 tracking-widest opacity-60">Eje Y (Valor)</label>
                                <select value={chart.metric} onChange={e => updateChart(sIdx, cIdx, {metric: e.target.value})} className={selectStyle}>
                                    {Object.keys(store[chart.tableName]?.columns || {}).map(c => <option key={c} value={c} className="bg-[#15181E] text-white">{c}</option>)}
                                </select>
                              </div>
                          </div>

                          <div>
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-widest opacity-60">Visualización</label>
                              <select value={chart.type} onChange={e => updateChart(sIdx, cIdx, {type: e.target.value as any})} className={selectStyle}>
                                <option value="bar" className="bg-[#15181E] text-white">📊 Barras</option>
                                <option value="pie" className="bg-[#15181E] text-white">⭕ Circular</option>
                                <option value="table" className="bg-[#15181E] text-white">📋 Tabla Detallada</option>
                                <option value="technicalFile" className="bg-[#15181E] text-white">📑 Ficha Técnica</option>
                                <option value="webview" className="bg-[#15181E] text-white">🌐 Visor Web</option>
                                <option value="tour360" className="bg-[#15181E] text-white">🏙️ Tour 360°</option>
                              </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-2">
                      <button onClick={() => addChart(sIdx, 'bar')} className="py-3 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all">+ GRÁFICO</button>
                      <button onClick={() => addChart(sIdx, 'table')} className="py-3 bg-dorado/10 border border-dorado/20 rounded-2xl text-[9px] font-black text-dorado uppercase hover:bg-dorado/20 transition-all">+ TABLA/FICHA</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-10 bg-[#0D0F13] border-t border-white/5 flex gap-4">
          {editableConfig && (
            <>
              <button onClick={() => setView(view === 'dashboard' ? 'table' : 'dashboard')} className="flex-1 py-5 border border-white/10 text-white font-[950] uppercase text-[10px] rounded-full hover:bg-white/5 transition-all">
                {view === 'dashboard' ? '📂 Datos' : '👁️ Preview'}
              </button>
              <button onClick={() => {
                const html = generateExportableHtml(store, editableConfig, { category: '', metric1: '', metric2: '' });
                const blob = new Blob([html], { type: 'text/html' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cerebro-sobse-reporte.html`; a.click();
              }} className="flex-1 py-5 bg-emerald-600 text-white font-[950] uppercase text-[10px] rounded-full shadow-2xl hover:scale-105 transition-all">📥 Exportar</button>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-16 bg-[#F8FAFC]">
        {loading && <div className="fixed inset-0 bg-white/95 z-[100] flex flex-col items-center justify-center animate-in fade-in"><div className="w-16 h-16 border-8 border-slate-100 border-t-guinda rounded-full animate-spin shadow-2xl" /><p className="mt-8 text-lg font-black text-slate-900 uppercase italic animate-pulse tracking-widest">Sincronizando Cerebro...</p></div>}
        {Object.keys(store).length > 0 ? (
          view === 'dashboard' && editableConfig ? (
            <div className="max-w-7xl mx-auto animate-in zoom-in-95 duration-700">
              <DashboardPreview store={store} config={editableConfig} mapping={{}} onUpdateConfig={setEditableConfig} />
            </div>
          ) : (
            <div className="h-full bg-white rounded-[4.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
               <div className="px-12 py-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-3xl font-[950] text-slate-900 uppercase italic tracking-tighter">{selectedTable}</h3>
                  <button onClick={() => setView('dashboard')} className="bg-guinda text-white px-8 py-3 rounded-full font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">Ver Tablero</button>
               </div>
               <div className="flex-1 overflow-auto p-10">
                 <table className="w-full text-left text-[11px]">
                   <thead>
                     <tr className="border-b-2 border-slate-100">
                       {Object.keys(store[selectedTable]?.columns || {}).map(k => <th key={k} className="px-6 py-4 font-black text-slate-500 uppercase italic">{k}</th>)}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {store[selectedTable]?.rows.slice(0, 100).map((r, i) => (
                       <tr key={i} className="hover:bg-slate-50 transition-colors">
                         {Object.keys(store[selectedTable].columns).map(k => <td key={k} className="px-6 py-4 text-slate-700 font-[600]">{String(r[k] || '')}</td>)}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-12">
             <div className="space-y-6">
               <h1 className="text-[100px] font-[950] text-[#0F172A] italic uppercase leading-[0.8] tracking-tighter">CEREBRO <span className="text-guinda">SOBSE</span></h1>
               <p className="text-2xl text-slate-400 italic max-w-2xl mx-auto">Vincular base de datos para análisis.</p>
             </div>
             <label className="group relative px-16 py-8 bg-[#691C32] text-white rounded-full font-[950] uppercase text-xl shadow-2xl hover:scale-105 transition-all cursor-pointer">
                <span>VINCULAR BASE DE DATOS</span>
                <input type="file" className="hidden" multiple onChange={e => e.target.files && processFiles(e.target.files)} />
             </label>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
