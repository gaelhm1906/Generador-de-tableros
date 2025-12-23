
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DataRow, AnalysisResult, ColumnMapping, DashboardConfig } from './types';
import { analyzeDataWithAI } from './services/geminiService';
import { SAMPLE_DATA, SOBSE_THEME, LOGOS } from './constants';
import DashboardPreview from './components/DashboardPreview';
import { generateExportableHtml } from './utils/exportUtils';

const App: React.FC = () => {
  const [data, setData] = useState<DataRow[]>([]);
  const [sources, setSources] = useState<{name: string, rows: number}[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'table'>('table');
  
  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [activeMapping, setActiveMapping] = useState<ColumnMapping>({
    category: '',
    metric1: '',
    metric2: ''
  });

  // Limpiar llaves duplicadas o vacías de los archivos (SheetJS a veces genera Unnamed)
  const cleanKeys = (rows: any[]) => {
    return rows.map(row => {
      const newRow: any = {};
      Object.keys(row).forEach(key => {
        if (!key.includes('Unnamed') && key.trim() !== "") {
          newRow[key] = row[key];
        }
      });
      return newRow;
    });
  };

  const keys = useMemo(() => {
    if (data.length === 0) return [];
    const keySet = new Set<string>();
    data.slice(0, 50).forEach(row => {
      Object.keys(row).forEach(k => keySet.add(k));
    });
    return Array.from(keySet);
  }, [data]);

  const processFiles = async (files: FileList) => {
    setLoading(true);
    let combinedRows: DataRow[] = [];
    const newSources: {name: string, rows: number}[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let rows: any[] = [];
        if (file.name.endsWith('.json')) {
          const text = await file.text();
          const json = JSON.parse(text);
          rows = Array.isArray(json) ? json : (json.data || json.rows || Object.values(json)[0]);
        } else {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer);
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(sheet);
        }
        
        const cleaned = cleanKeys(rows);
        combinedRows = [...combinedRows, ...cleaned];
        newSources.push({ name: file.name, rows: cleaned.length });
      } catch (err) {
        console.error("Error cargando archivo:", file.name, err);
      }
    }

    if (combinedRows.length > 0) {
      setData(combinedRows);
      setSources(newSources);
      setAnalysis(null); // Resetear análisis previo
      setView('table');
      // Mapeo inicial por defecto
      const firstKeys = Object.keys(combinedRows[0]);
      setActiveMapping({
        category: firstKeys[0] || '',
        metric1: firstKeys[1] || '',
        metric2: firstKeys[2] || ''
      });
    }
    setLoading(false);
  };

  const handleRunAI = async () => {
    if (data.length === 0) return;
    setLoading(true);
    try {
      const result = await analyzeDataWithAI(data);
      setAnalysis(result);
      setCustomTitle(result.suggestedConfig.title);
      setCustomSubtitle(result.suggestedConfig.subtitle);
      setActiveMapping(result.suggestedMapping);
      setView('dashboard');
    } catch (e) {
      alert("Error al analizar datos con la IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!analysis || !data.length) return;
    const finalConfig = {
      ...analysis.suggestedConfig,
      title: customTitle || analysis.suggestedConfig.title,
      subtitle: customSubtitle || analysis.suggestedConfig.subtitle
    };
    const html = generateExportableHtml(data, finalConfig, activeMapping);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_SOBSE_${customTitle.replace(/\s+/g, '_')}.html`;
    a.click();
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden font-sans text-slate-900">
      {/* Sidebar de Configuración */}
      <aside className="w-80 bg-[#1A1C23] text-white flex flex-col border-r border-slate-800 shadow-2xl z-30">
        <div className="p-6 border-b border-white/5 bg-guinda/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-guinda rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <span className="text-xl font-black italic">S</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-black uppercase tracking-widest text-white/90">SOBSE Intelligence</h1>
            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest italic">Agnostic AI Engine</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
          {/* Carga de Datos */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrada de Datos</h3>
            <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-guinda hover:bg-white/5 transition-all group text-center">
              <span className="text-[11px] font-black text-slate-300 group-hover:text-white uppercase">+ Añadir Bases</span>
              <span className="text-[9px] text-slate-600 mt-1 uppercase">Excel / JSON</span>
              <input type="file" className="hidden" accept=".xlsx,.json" multiple onChange={(e) => e.target.files && processFiles(e.target.files)} />
            </label>
            
            {sources.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {sources.map((s, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg text-[10px] border border-white/5">
                    <span className="truncate opacity-70 w-32">{s.name}</span>
                    <span className="text-emerald-400 font-bold">{s.rows}r</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Mapeo de Variables Inteligente */}
          {keys.length > 0 && (
            <section className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mapeo Semántico</h3>
                <span className="text-[9px] bg-guinda px-2 py-0.5 rounded text-white font-bold">Manual</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Dimensión (Eje X)</label>
                  <select 
                    value={activeMapping.category} 
                    onChange={e => setActiveMapping(p => ({...p, category: e.target.value}))} 
                    className="w-full bg-[#2D2F39] border-none rounded-xl text-xs p-3 text-white focus:ring-1 focus:ring-guinda transition-all"
                  >
                    {keys.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Métrica 1 (Valor)</label>
                  <select 
                    value={activeMapping.metric1} 
                    onChange={e => setActiveMapping(p => ({...p, metric1: e.target.value}))} 
                    className="w-full bg-[#2D2F39] border-none rounded-xl text-xs p-3 text-white focus:ring-1 focus:ring-guinda transition-all"
                  >
                    {keys.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Ajustes del Dashboard (Solo si hay análisis) */}
          {analysis && (
            <section className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visualización</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Título del Reporte</label>
                  <input value={customTitle} onChange={e => setCustomTitle(e.target.value)} className="w-full bg-[#2D2F39] border-none rounded-xl text-xs p-3 text-white focus:ring-1 focus:ring-guinda" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Resumen Ejecutivo</label>
                  <textarea value={customSubtitle} onChange={e => setCustomSubtitle(e.target.value)} className="w-full bg-[#2D2F39] border-none rounded-xl text-xs p-3 text-white h-20 resize-none focus:ring-1 focus:ring-guinda" />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Acciones principales */}
        <div className="p-5 border-t border-white/5 space-y-3 bg-[#13151A]">
          {data.length > 0 && !analysis && (
            <button onClick={handleRunAI} className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20">
              Analizar y Generar con IA
            </button>
          )}
          {analysis && (
            <button onClick={handleExport} className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-emerald-500 transition-all shadow-lg flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Exportar index.html
            </button>
          )}
          <div className="flex bg-[#2D2F39] p-1.5 rounded-2xl gap-1">
            <button onClick={() => setView('dashboard')} disabled={!analysis} className={`flex-1 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${!analysis ? 'opacity-30 cursor-not-allowed' : ''} ${view === 'dashboard' ? 'bg-guinda text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Tablero</button>
            <button onClick={() => setView('table')} className={`flex-1 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${view === 'table' ? 'bg-guinda text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Bases</button>
          </div>
        </div>
      </aside>

      {/* Área Principal de Visualización */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-8">
            <img src={LOGOS.CDMX} alt="CDMX" className="h-9 w-auto" />
            <div className="w-px h-8 bg-slate-200" />
            <img src={LOGOS.SOBSE} alt="SOBSE" className="h-9 w-auto" />
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Inteligencia Operativa SOBSE</span>
            <div className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">Generador Semántico v3.0</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative p-8">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-50">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-guinda rounded-full animate-spin mb-6" />
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest animate-pulse">Analizando estructura de datos...</h2>
              <p className="text-slate-500 text-sm mt-2">Estamos dividiendo y clasificando la información.</p>
            </div>
          )}

          {data.length > 0 ? (
            view === 'dashboard' && analysis ? (
              <div className="max-w-7xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <DashboardPreview data={data} config={{...analysis.suggestedConfig, title: customTitle, subtitle: customSubtitle}} mapping={activeMapping} />
              </div>
            ) : (
              <div className="max-w-full mx-auto h-full flex flex-col">
                <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-full animate-in zoom-in-95 duration-500">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Explorador de Dataset Fusionado</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {data.length} registros cargados correctamente de {sources.length} fuentes.
                      </p>
                    </div>
                    {!analysis && (
                      <button onClick={handleRunAI} className="px-10 py-4 bg-guinda text-white text-[11px] font-black uppercase rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">
                        Analizar con IA y Generar Tablero
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse min-w-full">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr>
                          {keys.map(k => (
                            <th key={k} className="px-6 py-5 border-b border-slate-100 bg-white group min-w-[200px]">
                              <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest truncate" title={k}>{k}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100">
                                  <button onClick={() => setActiveMapping(p => ({...p, category: k}))} className={`text-[8px] px-3 py-1.5 rounded-full font-black uppercase shadow-sm ${activeMapping.category === k ? 'bg-guinda text-white' : 'bg-slate-100 text-slate-500'}`}>Agrupar</button>
                                  <button onClick={() => setActiveMapping(p => ({...p, metric1: k}))} className={`text-[8px] px-3 py-1.5 rounded-full font-black uppercase shadow-sm ${activeMapping.metric1 === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Sumar</button>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.slice(0, 100).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            {keys.map(k => (
                              <td key={k} className="px-6 py-4 text-[11px] text-slate-600 font-bold border-r border-slate-50 last:border-r-0">
                                {typeof row[k] === 'number' ? row[k].toLocaleString() : (row[k] || '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
               <div className="max-w-2xl space-y-12 animate-in fade-in slide-in-from-top-8 duration-1000">
                  <div className="flex justify-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                     <img src={LOGOS.CDMX} className="h-20 w-auto" />
                     <img src={LOGOS.SOBSE} className="h-20 w-auto" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-7xl font-black text-slate-900 uppercase tracking-tighter leading-none">Cerebro de Datos SOBSE</h2>
                    <p className="text-2xl text-slate-500 font-medium leading-relaxed">
                      Sube cualquier archivo Excel o JSON. Nuestra IA analizará la semántica, dividirá la información y diseñará el mejor tablero visual para tu gestión.
                    </p>
                  </div>
                  <div className="flex justify-center gap-6">
                     <label className="px-16 py-6 bg-guinda text-white font-black rounded-[3rem] shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-3 text-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Cargar Bases de Datos
                        <input type="file" className="hidden" accept=".xlsx,.json" multiple onChange={(e) => e.target.files && processFiles(e.target.files)} />
                     </label>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
