
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DataRow, TableStore, ColumnMetadata, DashboardConfig, ChartConfig, KPIConfig, DashboardSection } from './types';
import { analyzeMultiTableData } from './services/localAnalysisService';
import { analyzeDataWithAI } from './services/geminiService';
import { LOGOS, SOBSE_THEME } from './constants';
import DashboardPreview from './components/DashboardPreview';
import { generateExportableHtml } from './utils/exportUtils';

const BRAIN_MEMORY_KEY = 'sobse_brain_v2_memory';

const App: React.FC = () => {
  const [store, setStore] = useState<TableStore>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Sincronizando Cerebro...");
  const [view, setView] = useState<'dashboard' | 'table'>('table');
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [editableConfig, setEditableConfig] = useState<DashboardConfig | null>(null);

  useEffect(() => {
    if (editableConfig) {
      localStorage.setItem(BRAIN_MEMORY_KEY, JSON.stringify(editableConfig));
    }
  }, [editableConfig]);

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
    setLoadingMsg("Analizando Archivos...");
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
    setLoadingMsg("Iniciando IA Estratégica...");
    
    try {
      const mainTableName = selectedTable || Object.keys(store)[0];
      const data = store[mainTableName].rows;
      
      // Intentar primero con la IA para un resultado "casi terminado"
      const result = await analyzeDataWithAI(data, mainTableName);
      setEditableConfig(result.suggestedConfig);
      setView('dashboard');
    } catch (e) {
      console.warn("La IA falló, usando motor local de respaldo:", e);
      setLoadingMsg("Motor Local Activado...");
      // Respaldo local si la IA falla
      const result = analyzeMultiTableData(store);
      setEditableConfig(result.suggestedConfig);
      setView('dashboard');
    }
    
    setLoading(false);
  };

  const updateKPI = (idx: number, fields: Partial<KPIConfig>) => {
    if (!editableConfig) return;
    const newKpis = [...editableConfig.kpis];
    if (fields.tableName && fields.tableName !== newKpis[idx].tableName) {
      const availableCols = Object.keys(store[fields.tableName]?.columns || {});
      fields.key = availableCols[0] || "";
    }
    newKpis[idx] = { ...newKpis[idx], ...fields };
    setEditableConfig({ ...editableConfig, kpis: newKpis });
  };

  const updateChart = (sIdx: number, cIdx: number, fields: Partial<ChartConfig>) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections[sIdx].charts[cIdx] = { ...sections[sIdx].charts[cIdx], ...fields };
    setEditableConfig({ ...editableConfig, sections });
  };

  const addSection = () => {
    if (!editableConfig) return;
    const newSection: DashboardSection = {
      title: "NUEVA SECCIÓN",
      description: "Agregue herramientas o gráficas aquí",
      charts: []
    };
    setEditableConfig({ ...editableConfig, sections: [...editableConfig.sections, newSection] });
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
      title: type === 'webview' ? 'Visor Web' : (type === 'tour360' ? 'Tour 360' : (type === 'timeline' ? 'Línea de Avance' : 'Gráfico')),
      dimension: cols[0] || "",
      metric: cols.find(c => store[tableName].columns[c].isMetric) || cols[0] || "",
      color: SOBSE_THEME.GUINDA,
      url: type === 'webview' || type === 'tour360' ? 'https://' : undefined
    };
    
    sections[sIdx].charts.push(newChart);
    setEditableConfig({ ...editableConfig, sections });
  };

  const removeSection = (sIdx: number) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections.splice(sIdx, 1);
    setEditableConfig({ ...editableConfig, sections });
  };

  const inputBase = "bg-[#1C2129] border border-white/10 text-white text-[11px] p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-dorado transition-all w-full font-bold shadow-inner";
  const selectStyle = "bg-[#1C2129] border border-white/10 text-white text-[11px] p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-dorado transition-all w-full font-bold cursor-pointer hover:bg-[#252C36]";

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="w-[440px] bg-[#0D1014] text-white flex flex-col shadow-[10px_0_50px_rgba(0,0,0,0.2)] z-40 border-r border-white/5">
        <div className="p-10 bg-white border-b border-slate-200 flex items-center gap-4 shrink-0">
          <img src={LOGOS.CORAZON} alt="SOBSE" className="h-10 w-auto" />
          <div>
            <h1 className="text-[14px] font-[950] uppercase text-slate-900 leading-tight italic tracking-tighter">Cerebro de Datos</h1>
            <p className="text-[9px] font-black text-guinda uppercase tracking-widest opacity-80 italic">Gestión Estratégica</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide">
          {!editableConfig ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
              <label className="group block w-full p-12 border-2 border-dashed border-white/10 rounded-[4rem] hover:border-dorado/50 hover:bg-white/[0.02] transition-all text-center cursor-pointer">
                <span className="text-5xl block mb-6">📊</span>
                <span className="text-[13px] font-[950] uppercase text-white tracking-widest italic">Vincular Base de Datos</span>
                <input type="file" className="hidden" multiple onChange={e => e.target.files && processFiles(e.target.files)} />
              </label>
              <div className="space-y-3">
                {Object.keys(store).map(name => (
                  <button key={name} onClick={() => setSelectedTable(name)} className={`w-full text-left px-8 py-5 rounded-[2.5rem] text-[10px] font-black border uppercase transition-all flex items-center justify-between ${selectedTable === name ? 'bg-guinda border-guinda text-white shadow-2xl scale-105' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}>
                    <span className="truncate">{name}</span>
                    {selectedTable === name && <span className="w-2 h-2 bg-emerald-400 rounded-full" />}
                  </button>
                ))}
              </div>
              {Object.keys(store).length > 0 && (
                <button onClick={startAnalysis} className="w-full py-7 bg-guinda text-white font-[950] uppercase text-[12px] rounded-full shadow-[0_20px_40px_rgba(105,28,50,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                  🚀 Generar Tablero Inteligente
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-8">
                <div className="flex justify-between items-center px-4">
                  <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Tarjetas (KPIs)</h4>
                  <button onClick={() => {
                     const tableName = Object.keys(store)[0];
                     const cols = Object.keys(store[tableName]?.columns || {});
                     // Fixed typo from SOBSE_THEION_GUINDA to SOBSE_THEME.GUINDA
                     setEditableConfig({...editableConfig, kpis: [...editableConfig.kpis, {label: 'NUEVA', tableName, key: cols[0], format: 'number', width: '1/4', statusColor: SOBSE_THEME.GUINDA}]});
                  }} className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-5 py-2 rounded-full border border-emerald-400/20 hover:bg-emerald-400/20 transition-all">+ NUEVA</button>
                </div>
                <div className="space-y-6">
                  {editableConfig.kpis.map((kpi, kIdx) => (
                    <div key={kIdx} className="bg-[#15181E] p-8 rounded-[3.5rem] border border-white/10 space-y-4 relative group shadow-xl">
                      <button onClick={() => {
                         const n = [...editableConfig.kpis]; n.splice(kIdx, 1); setEditableConfig({...editableConfig, kpis: n});
                      }} className="absolute top-6 right-8 text-white/20 hover:text-red-400 text-2xl">×</button>
                      <input value={kpi.label} onChange={e => updateKPI(kIdx, {label: e.target.value})} className={inputBase} />
                      <div className="grid grid-cols-2 gap-3">
                         <select value={kpi.tableName} onChange={e => updateKPI(kIdx, {tableName: e.target.value})} className={selectStyle}>
                            {Object.keys(store).map(name => <option key={name} value={name} className="bg-[#0D1014]">{name}</option>)}
                         </select>
                         <select value={kpi.key} onChange={e => updateKPI(kIdx, {key: e.target.value})} className={selectStyle}>
                            {Object.keys(store[kpi.tableName]?.columns || {}).map(c => <option key={c} value={c} className="bg-[#0D1014]">{c}</option>)}
                         </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8 border-t border-white/5 pt-12">
                 <div className="flex justify-between items-center px-4">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Herramientas Visuales</h4>
                    <button onClick={addSection} className="text-[10px] font-black text-dorado uppercase bg-dorado/10 px-5 py-2 rounded-full border border-dorado/20 hover:bg-dorado/20 transition-all">+ SECCIÓN</button>
                 </div>
                 {editableConfig.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="bg-white/[0.02] p-8 rounded-[4rem] border border-white/5 space-y-6 relative group">
                       <button onClick={() => removeSection(sIdx)} className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl font-black">×</button>
                       <input value={sec.title} onChange={e => { const n = [...editableConfig.sections]; n[sIdx].title = e.target.value; setEditableConfig({...editableConfig, sections: n}); }} className="bg-transparent text-[13px] font-[950] text-white uppercase italic outline-none w-full border-b border-white/10 pb-3" />
                       
                       <div className="space-y-4">
                          {sec.charts.map((chart, cIdx) => (
                            <div key={cIdx} className="bg-[#15181E] p-8 rounded-[3.5rem] border border-white/10 space-y-6 relative">
                               <button onClick={() => { const n = [...editableConfig.sections]; n[sIdx].charts.splice(cIdx,1); setEditableConfig({...editableConfig, sections: n}); }} className="absolute top-4 right-6 text-white/20 hover:text-white text-xl">×</button>
                               <div className="flex items-center gap-3">
                                  <input type="color" value={chart.color} onChange={e => updateChart(sIdx, cIdx, {color: e.target.value})} className="w-6 h-6 rounded-full cursor-pointer bg-transparent" />
                                  <input value={chart.title} onChange={e => updateChart(sIdx, cIdx, {title: e.target.value})} className="bg-transparent text-[11px] font-[950] text-white uppercase outline-none flex-1 italic" />
                               </div>
                               
                               <div className="space-y-4">
                                  <div>
                                     <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-1 block">TIPO DE HERRAMIENTA</label>
                                     <select value={chart.type} onChange={e => updateChart(sIdx, cIdx, {type: e.target.value as any})} className={selectStyle}>
                                        <option value="bar" className="bg-[#0D1014]">Gráfico de Barras</option>
                                        <option value="pie" className="bg-[#0D1014]">Gráfico Circular</option>
                                        <option value="timeline" className="bg-[#0D1014]">📈 Línea de Avance</option>
                                        <option value="webview" className="bg-[#0D1014]">🌐 Visor Web Externo</option>
                                        <option value="tour360" className="bg-[#0D1014]">🏙️ Recorrido 360°</option>
                                        <option value="table" className="bg-[#0D1014]">📋 Tabla de Datos</option>
                                        <option value="technicalFile" className="bg-[#0D1014]">📑 Ficha Técnica</option>
                                     </select>
                                  </div>

                                  {(chart.type === 'webview' || chart.type === 'tour360') ? (
                                    <div className="space-y-2">
                                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2 block">URL DEL RECURSO</label>
                                       <input value={chart.url || ''} onChange={e => updateChart(sIdx, cIdx, {url: e.target.value})} placeholder="https://..." className={inputBase} />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                       <select value={chart.dimension} onChange={e => updateChart(sIdx, cIdx, {dimension: e.target.value})} className={selectStyle}>
                                          {Object.keys(store[chart.tableName]?.columns || {}).map(c => <option key={c} value={c} className="bg-[#0D1014]">{c}</option>)}
                                       </select>
                                       <select value={chart.metric} onChange={e => updateChart(sIdx, cIdx, {metric: e.target.value})} className={selectStyle}>
                                          {Object.keys(store[chart.tableName]?.columns || {}).map(c => <option key={c} value={c} className="bg-[#0D1014]">{c}</option>)}
                                       </select>
                                    </div>
                                  )}
                               </div>
                            </div>
                          ))}
                       </div>
                       <div className="grid grid-cols-2 gap-3 pt-4">
                          <button onClick={() => addChart(sIdx, 'bar')} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:bg-white/10 transition-all">+ GRÁFICA</button>
                          <button onClick={() => addChart(sIdx, 'webview')} className="py-4 bg-dorado/10 border border-dorado/20 rounded-2xl text-[9px] font-black uppercase text-dorado hover:bg-dorado/20 transition-all">+ WEB / 360</button>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-10 bg-[#0A0D10] border-t border-white/5 flex gap-4 shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          {editableConfig && (
            <>
              <button onClick={() => setView(view === 'dashboard' ? 'table' : 'dashboard')} className="flex-1 py-6 border border-white/10 text-white font-[950] uppercase text-[11px] rounded-full hover:bg-white/5 transition-all active:scale-95">
                {view === 'dashboard' ? '📂 Datos' : '👁️ Preview'}
              </button>
              <button onClick={() => {
                const html = generateExportableHtml(store, editableConfig, { category: '', metric1: '', metric2: '' });
                const blob = new Blob([html], { type: 'text/html' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cerebro-sobse-${editableConfig.title.toLowerCase().replace(/\s+/g, '-')}.html`; a.click();
              }} className="flex-1 py-6 bg-emerald-600 text-white font-[950] uppercase text-[11px] rounded-full shadow-[0_15px_30px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all">📥 Exportar</button>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-16 bg-[#F8FAFC] scrollbar-hide">
        {loading && (
          <div className="fixed inset-0 bg-white/95 z-[100] flex flex-col items-center justify-center animate-in fade-in">
            <div className="w-20 h-20 border-8 border-slate-100 border-t-guinda rounded-full animate-spin shadow-2xl" />
            <p className="mt-8 text-xl font-black text-slate-900 uppercase italic animate-pulse tracking-widest">{loadingMsg}</p>
          </div>
        )}
        
        {Object.keys(store).length > 0 ? (
          view === 'dashboard' && editableConfig ? (
            <div className="max-w-7xl mx-auto animate-in zoom-in-95 duration-700">
              <DashboardPreview store={store} config={editableConfig} mapping={{}} onUpdateConfig={setEditableConfig} />
            </div>
          ) : (
            <div className="h-full bg-white rounded-[5rem] shadow-[0_50px_100px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col border border-slate-200">
               <div className="px-16 py-12 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-4xl font-[950] text-slate-900 uppercase italic tracking-tighter leading-none">{selectedTable}</h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3 italic">Vista de auditoría de datos fuente</p>
                  </div>
                  <button onClick={() => setView('dashboard')} className="bg-guinda text-white px-10 py-4 rounded-full font-[950] text-[12px] uppercase shadow-2xl hover:scale-105 transition-all active:scale-95">Ver Tablero Estratégico</button>
               </div>
               <div className="flex-1 overflow-auto p-12">
                 <table className="w-full text-left text-[12px] border-separate border-spacing-y-2">
                   <thead>
                     <tr className="border-b-2 border-slate-100">
                       {Object.keys(store[selectedTable]?.columns || {}).map(k => <th key={k} className="px-6 py-5 font-black text-slate-400 uppercase italic tracking-tight">{k}</th>)}
                     </tr>
                   </thead>
                   <tbody>
                     {store[selectedTable]?.rows.slice(0, 100).map((r, i) => (
                       <tr key={i} className="bg-white hover:bg-slate-50 transition-colors shadow-sm">
                         {Object.keys(store[selectedTable].columns).map(k => <td key={k} className="px-6 py-5 text-slate-700 font-bold border-b border-slate-50">{String(r[k] || '')}</td>)}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-16 max-w-4xl mx-auto">
             <div className="space-y-8">
               <div className="inline-flex items-center gap-6 bg-guinda/5 px-8 py-3 rounded-full border border-guinda/10 mb-4 animate-bounce">
                  <span className="w-3 h-3 bg-guinda rounded-full" />
                  <span className="text-[11px] font-[950] text-guinda uppercase tracking-[0.3em] italic">Sistema de Monitoreo SOBSE</span>
               </div>
               <h1 className="text-[120px] font-[950] text-[#0F172A] italic uppercase leading-[0.75] tracking-tighter">CEREBRO DE <span className="text-guinda">DATOS</span></h1>
               <p className="text-2xl text-slate-400 italic font-medium leading-relaxed">Arquitectura avanzada para el análisis y visualización de infraestructura pública.</p>
             </div>
             <label className="group relative px-20 py-10 bg-[#691C32] text-white rounded-[4rem] font-[950] uppercase text-2xl shadow-[0_30px_60px_rgba(105,28,50,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-6">VINCULAR DATASET 🏛️</span>
                <input type="file" className="hidden" multiple onChange={e => e.target.files && processFiles(e.target.files)} />
             </label>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
