
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DataRow, TableStore, ColumnMetadata, AnalysisResult, ColumnMapping, DashboardConfig, ChartConfig, DashboardSection } from './types';
import { analyzeMultiTableData } from './services/localAnalysisService';
import { LOGOS, SOBSE_THEME } from './constants';
import DashboardPreview from './components/DashboardPreview';
import { generateExportableHtml } from './utils/exportUtils';

const App: React.FC = () => {
  const [store, setStore] = useState<TableStore>({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'table'>('table');
  const [selectedTable, setSelectedTable] = useState<string>("");
  
  // Fix: Added missing state to store analysis results and resolve 'setAnalysis' error
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [editableConfig, setEditableConfig] = useState<DashboardConfig | null>(null);
  const [activeMapping, setActiveMapping] = useState<ColumnMapping>({
    category: '', metric1: '', metric2: ''
  });

  const getColumnMetadata = (rows: DataRow[]): { [key: string]: ColumnMetadata } => {
    const cols: { [key: string]: ColumnMetadata } = {};
    if (rows.length === 0) return cols;
    const sample = rows.slice(0, 50);
    const keys = Object.keys(rows[0]);
    keys.forEach(key => {
      const values = sample.map(r => r[key]);
      const uniqueValues = new Set(values).size;
      const isNumeric = values.every(v => v === null || v === undefined || !isNaN(parseFloat(String(v).replace(/[^0-9.-]+/g, ""))));
      cols[key] = {
        name: key,
        type: isNumeric ? 'number' : 'text',
        uniqueRatio: uniqueValues / sample.length,
        isMetric: isNumeric,
        isDimension: !isNumeric && uniqueValues > 1 && uniqueValues < 50,
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
        if (file.name.endsWith('.json')) {
          const text = await file.text();
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            newStore[file.name] = { rows: json, columns: getColumnMetadata(json) };
          }
        } else {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer);
          wb.SheetNames.forEach(name => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name]) as DataRow[];
            if (rows.length > 0) newStore[name] = { rows, columns: getColumnMetadata(rows) };
          });
        }
      } catch (err) { console.error(err); }
    }
    setStore(newStore);
    const tables = Object.keys(newStore);
    if (tables.length > 0) {
      setSelectedTable(tables[0]);
      setView('table');
    }
    setLoading(false);
  };

  const runAnalysis = () => {
    if (!selectedTable) return;
    setLoading(true);
    setTimeout(() => {
      const result = analyzeMultiTableData(store);
      // Fix: setAnalysis is now defined via useState to store the full analysis result
      setAnalysis(result);
      setEditableConfig(result.suggestedConfig);
      setActiveMapping(result.suggestedMapping);
      setView('dashboard');
      setLoading(false);
    }, 600);
  };

  // --- MÉTODOS DE EDICIÓN MANUAL ---
  
  const addKPI = () => {
    if (!editableConfig) return;
    const newKpi = { label: "Nuevo Indicador", key: currentKeys[0], format: 'number' as const };
    setEditableConfig({ ...editableConfig, kpis: [...editableConfig.kpis, newKpi] });
  };

  const removeKPI = (idx: number) => {
    if (!editableConfig) return;
    const kpis = [...editableConfig.kpis];
    kpis.splice(idx, 1);
    setEditableConfig({ ...editableConfig, kpis });
  };

  const addSection = () => {
    if (!editableConfig) return;
    const newSection: DashboardSection = {
      title: "Nueva Sección Temática",
      description: "Descripción de este bloque de análisis",
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

  const addChart = (sIdx: number) => {
    if (!editableConfig) return;
    const newChart: ChartConfig = {
      id: `c-${Date.now()}`,
      type: 'bar',
      title: "Nueva Gráfica",
      dimension: dimensionKeys[0] || currentKeys[0],
      metric: metricKeys[0] || currentKeys[0],
      color: SOBSE_THEME.GUINDA
    };
    const sections = [...editableConfig.sections];
    sections[sIdx].charts.push(newChart);
    setEditableConfig({ ...editableConfig, sections });
  };

  const removeChart = (sIdx: number, cIdx: number) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections[sIdx].charts.splice(cIdx, 1);
    setEditableConfig({ ...editableConfig, sections });
  };

  const updateChart = (sIdx: number, cIdx: number, fields: any) => {
    if (!editableConfig) return;
    const newConfig = { ...editableConfig };
    newConfig.sections[sIdx].charts[cIdx] = { ...newConfig.sections[sIdx].charts[cIdx], ...fields };
    setEditableConfig(newConfig);
  };

  const updateKPI = (kIdx: number, fields: any) => {
    if (!editableConfig) return;
    const newConfig = { ...editableConfig };
    newConfig.kpis[kIdx] = { ...newConfig.kpis[kIdx], ...fields };
    setEditableConfig(newConfig);
  };

  const handleExport = () => {
    if (!editableConfig || !selectedTable) return;
    const html = generateExportableHtml(store[selectedTable].rows, editableConfig, activeMapping);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOBSE_Custom_${editableConfig.title.replace(/\s/g, '_')}.html`;
    a.click();
  };

  const currentKeys = selectedTable ? Object.keys(store[selectedTable].columns) : [];
  const metricKeys = currentKeys.filter(k => store[selectedTable].columns[k].isMetric);
  const dimensionKeys = currentKeys.filter(k => !store[selectedTable].columns[k].isMetric);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-['Plus_Jakarta_Sans']">
      {/* SIDEBAR DE CONTROL - MODO COPILOTO */}
      <aside className="w-[420px] bg-[#13151A] text-white flex flex-col shadow-2xl z-40 border-r border-white/5">
        <div className="p-8 bg-guinda/20 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-guinda rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-2xl">S</div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-widest text-white">Dashboard Designer</h1>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter italic">SOBSE v6.0 Manual/AI</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-10">
          {!editableConfig ? (
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fuentes de Datos</h3>
              <label className="block w-full p-10 border-2 border-dashed border-slate-700 rounded-[2.5rem] hover:border-guinda hover:bg-white/5 transition-all text-center cursor-pointer group">
                <span className="text-xs font-black uppercase text-slate-400 group-hover:text-white block mb-2">Cargar Archivo</span>
                <span className="text-[9px] text-slate-600">Excel o JSON</span>
                <input type="file" className="hidden" multiple accept=".xlsx,.json" onChange={e => e.target.files && processFiles(e.target.files)} />
              </label>
              <div className="space-y-2">
                {Object.keys(store).map(name => (
                  <button key={name} onClick={() => setSelectedTable(name)} className={`w-full text-left px-5 py-4 rounded-3xl text-[11px] font-bold flex justify-between items-center transition-all ${selectedTable === name ? 'bg-guinda text-white shadow-xl scale-[1.02]' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    <span className="truncate w-48">{name}</span>
                    <span className="text-[9px] opacity-40">{store[name].rows.length} filas</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              <header className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                 <span className="text-[10px] font-black text-emerald-400 uppercase">Editor Activo</span>
                 <button onClick={() => setEditableConfig(null)} className="text-[10px] text-slate-500 font-bold hover:text-white">Cambiar Fuente</button>
              </header>

              {/* TÍTULOS PRINCIPALES */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase">Título del Proyecto</label>
                <input value={editableConfig.title} onChange={e => setEditableConfig({...editableConfig, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-guinda outline-none" />
              </div>

              {/* GESTIÓN DE KPIs */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase">Indicadores Superiores</h4>
                  <button onClick={addKPI} className="text-[10px] font-black text-guinda bg-white px-3 py-1 rounded-full">+ Agregar</button>
                </div>
                <div className="space-y-3">
                  {editableConfig.kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-white/5 p-5 rounded-3xl border border-white/5 space-y-3 relative group">
                      <button onClick={() => removeKPI(idx)} className="absolute top-4 right-4 text-xs opacity-0 group-hover:opacity-100 text-red-400">✕</button>
                      <input value={kpi.label} onChange={e => updateKPI(idx, {label: e.target.value})} className="bg-transparent text-[11px] font-black text-emerald-400 w-full outline-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={kpi.key} onChange={e => updateKPI(idx, {key: e.target.value})} className="bg-[#2D2F39] text-[9px] p-2 rounded-xl border-none">
                          {currentKeys.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <select value={kpi.format} onChange={e => updateKPI(idx, {format: e.target.value})} className="bg-[#2D2F39] text-[9px] p-2 rounded-xl border-none">
                          <option value="number">Número</option>
                          <option value="currency">Moneda</option>
                          <option value="percent">Porcentaje</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GESTIÓN DE SECCIONES Y GRÁFICAS */}
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contenido Visual</h4>
                  <button onClick={addSection} className="text-[10px] font-black text-white bg-emerald-600 px-3 py-1 rounded-full">+ Nueva Sección</button>
                </div>

                {editableConfig.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-6 relative group/sec">
                    <button onClick={() => removeSection(sIdx)} className="absolute top-6 right-6 text-xs text-red-500 opacity-0 group-hover/sec:opacity-100">Eliminar Sección</button>
                    <input value={sec.title} onChange={e => {
                      const sections = [...editableConfig.sections];
                      sections[sIdx].title = e.target.value;
                      setEditableConfig({...editableConfig, sections});
                    }} className="bg-transparent text-xs font-black uppercase text-white outline-none w-full" />
                    
                    <div className="space-y-4">
                      {sec.charts.map((chart, cIdx) => (
                        <div key={cIdx} className="bg-[#1A1C23] p-5 rounded-3xl space-y-4 border border-white/5 relative group/chart">
                          <button onClick={() => removeChart(sIdx, cIdx)} className="absolute top-4 right-4 text-[10px] text-slate-600 hover:text-red-400 opacity-0 group-hover/chart:opacity-100">✕</button>
                          <input value={chart.title} onChange={e => updateChart(sIdx, cIdx, {title: e.target.value})} className="bg-transparent text-[10px] font-bold text-white/90 w-full outline-none" />
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8px] text-slate-500 uppercase">Eje X (Dimensión)</label>
                              <select value={chart.dimension} onChange={e => updateChart(sIdx, cIdx, {dimension: e.target.value})} className="w-full bg-slate-800 text-[9px] p-2 rounded-xl">
                                {dimensionKeys.map(k => <option key={k} value={k}>{k}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-slate-500 uppercase">Eje Y (Métrica)</label>
                              <select value={chart.metric} onChange={e => updateChart(sIdx, cIdx, {metric: e.target.value})} className="w-full bg-slate-800 text-[9px] p-2 rounded-xl">
                                {metricKeys.map(k => <option key={k} value={k}>{k}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-slate-500 uppercase">Tipo</label>
                              <select value={chart.type} onChange={e => updateChart(sIdx, cIdx, {type: e.target.value})} className="w-full bg-slate-800 text-[9px] p-2 rounded-xl">
                                <option value="bar">Barra</option>
                                <option value="pie">Dona/Pie</option>
                                <option value="area">Área</option>
                                <option value="line">Línea</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-slate-500 uppercase">Color</label>
                              <select value={chart.color} onChange={e => updateChart(sIdx, cIdx, {color: e.target.value})} className="w-full bg-slate-800 text-[9px] p-2 rounded-xl">
                                <option value={SOBSE_THEME.GUINDA}>Guinda</option>
                                <option value={SOBSE_THEME.VERDE}>Verde</option>
                                <option value={SOBSE_THEME.DORADO}>Dorado</option>
                                <option value="#2D2F39">Slate</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => addChart(sIdx)} className="w-full py-3 border-2 border-dashed border-slate-700 rounded-2xl text-[10px] font-black text-slate-500 hover:text-white hover:border-slate-500 transition-all">
                        + Agregar Gráfica
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACCIONES */}
        <div className="p-8 bg-[#0F1115] border-t border-white/5 space-y-4">
          {!editableConfig && Object.keys(store).length > 0 ? (
            <button onClick={runAnalysis} className="w-full py-5 bg-guinda text-white font-black uppercase text-[11px] rounded-full hover:scale-[1.02] shadow-2xl transition-all">
              Generar Propuesta IA
            </button>
          ) : editableConfig && (
            <button onClick={handleExport} className="w-full py-5 bg-emerald-600 text-white font-black uppercase text-[11px] rounded-full hover:scale-[1.02] shadow-2xl transition-all">
               Descargar Tablero Final
            </button>
          )}
          <div className="flex bg-white/5 p-1 rounded-full">
            <button onClick={() => setView('dashboard')} disabled={!editableConfig} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-full transition-all ${view === 'dashboard' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500'}`}>Visualizar</button>
            <button onClick={() => setView('table')} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-full transition-all ${view === 'table' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500'}`}>Datos</button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE VISUALIZACIÓN */}
      <main className="flex-1 overflow-y-auto p-12 bg-slate-50 relative scrollbar-hide">
        {loading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
            <div className="w-20 h-20 border-[6px] border-slate-100 border-t-guinda rounded-full animate-spin mb-8" />
            <p className="text-xl font-black text-slate-900 uppercase italic tracking-tighter animate-pulse">Sincronizando con el Cerebro...</p>
          </div>
        )}

        {Object.keys(store).length > 0 ? (
          view === 'dashboard' && editableConfig ? (
            <div className="max-w-6xl mx-auto animate-in fade-in zoom-in duration-700">
               <DashboardPreview data={store[selectedTable].rows} config={editableConfig} mapping={activeMapping} />
            </div>
          ) : (
            <div className="h-full bg-white rounded-[4rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-12 border-b border-slate-100 bg-slate-50/50 flex justify-between items-end">
                <div>
                   <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedTable}</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Explorador de Auditoría</p>
                </div>
                <div className="text-right">
                   <span className="text-5xl font-black text-guinda opacity-10">{store[selectedTable].rows.length}</span>
                   <p className="text-[9px] font-black text-slate-400 uppercase">Registros</p>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr>
                      {currentKeys.map(k => (
                        <th key={k} className="px-8 py-5 bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                    {store[selectedTable].rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        {currentKeys.map(k => <td key={k} className="px-8 py-5 whitespace-nowrap">{String(row[k] || '—')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-16">
             <div className="relative">
                <div className="absolute -inset-10 bg-guinda/10 rounded-full blur-[60px] animate-pulse"></div>
                <img src={LOGOS.CDMX} className="h-20 relative z-10" />
             </div>
             <div className="space-y-4">
               <h1 className="text-8xl font-black text-slate-900 uppercase tracking-tighter leading-[0.8]">Cerebro de Datos <span className="text-guinda italic">SOBSE</span></h1>
               <p className="text-2xl text-slate-400 font-medium italic">Sube un Excel y construye tableros de mando ejecutivos en segundos.</p>
             </div>
             <label className="px-16 py-8 bg-guinda text-white rounded-[3.5rem] font-black uppercase text-2xl shadow-[0_25px_60px_rgba(105,28,50,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer">
                Comenzar Carga
                <input type="file" className="hidden" multiple accept=".xlsx,.json" onChange={e => e.target.files && processFiles(e.target.files)} />
             </label>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
