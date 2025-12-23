import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { DataRow, AnalysisResult } from './types';
import { analyzeDataWithAI } from './services/geminiService';
import { SAMPLE_DATA, SOBSE_THEME } from './constants';
import DashboardPreview from './components/DashboardPreview';

const App: React.FC = () => {
  const [data, setData] = useState<DataRow[] | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'table'>('dashboard');

  // Estados para comparativas dinámicas elegidas por el usuario
  const [activeMapping, setActiveMapping] = useState({
    category: '',
    metric1: '',
    metric2: ''
  });

  const processFile = async (file: File) => {
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as DataRow[];
      
      if (jsonData.length > 0) {
        setData(jsonData);
        const aiResult = await analyzeDataWithAI(jsonData);
        setAnalysis(aiResult);
        setActiveMapping({
          category: aiResult.suggestedMapping.category,
          metric1: aiResult.suggestedMapping.metric1,
          metric2: aiResult.suggestedMapping.metric2
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al procesar archivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const keys = useMemo(() => (data && data.length > 0 ? Object.keys(data[0]) : []), [data]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Sidebar de Control */}
      <aside className="w-full lg:w-80 bg-slate-900 text-white shrink-0 flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-guinda rounded-lg flex items-center justify-center font-bold">S</div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase">SOBSE Core</h1>
            <p className="text-[10px] opacity-50 font-bold uppercase tracking-tighter">Analizador Inteligente</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Carga de Datos</h3>
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-guinda hover:bg-slate-800 transition-all">
                <span className="text-xs font-bold text-slate-400">Subir Excel / JSON</span>
                <input type="file" className="hidden" accept=".xlsx,.json" onChange={handleFileUpload} />
              </label>
              <button 
                onClick={async () => {
                  setLoading(true);
                  setData(SAMPLE_DATA);
                  const res = await analyzeDataWithAI(SAMPLE_DATA);
                  setAnalysis(res);
                  setActiveMapping(res.suggestedMapping);
                  setLoading(false);
                }}
                className="w-full py-2 text-xs font-bold text-emerald-400 border border-emerald-900/30 bg-emerald-950/20 rounded-lg hover:bg-emerald-900/40"
              >
                Cargar Demo
              </button>
            </div>
          </section>

          {analysis && (
            <>
              <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">IA Insight</h3>
                <p className="text-xs text-slate-300 italic leading-relaxed">"{analysis.dataOverview}"</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Comparativas Dinámicas</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Dimensión (Eje X)</label>
                    <select 
                      className="w-full bg-slate-800 border-none rounded-lg text-xs p-2 focus:ring-1 focus:ring-guinda"
                      value={activeMapping.category}
                      onChange={(e) => setActiveMapping(prev => ({ ...prev, category: e.target.value }))}
                    >
                      {keys.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Métrica Principal</label>
                    <select 
                      className="w-full bg-slate-800 border-none rounded-lg text-xs p-2 focus:ring-1 focus:ring-guinda"
                      value={activeMapping.metric1}
                      onChange={(e) => setActiveMapping(prev => ({ ...prev, metric1: e.target.value }))}
                    >
                      {keys.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Métrica Secundaria</label>
                    <select 
                      className="w-full bg-slate-800 border-none rounded-lg text-xs p-2 focus:ring-1 focus:ring-guinda"
                      value={activeMapping.metric2}
                      onChange={(e) => setActiveMapping(prev => ({ ...prev, metric2: e.target.value }))}
                    >
                      {keys.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-black/20 space-y-2">
          <div className="flex gap-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${view === 'dashboard' ? 'bg-guinda text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              Tablero
            </button>
            <button 
              onClick={() => setView('table')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${view === 'table' ? 'bg-guinda text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              Datos
            </button>
          </div>
          <button 
            disabled={!analysis}
            className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30"
          >
            Exportar index.html
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-guinda rounded-full animate-spin mb-4" />
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest animate-pulse">Analizando estructura...</p>
          </div>
        ) : data && analysis ? (
          view === 'dashboard' ? (
            <DashboardPreview 
              data={data} 
              config={analysis.suggestedConfig} 
              mapping={activeMapping} 
            />
          ) : (
            <div className="p-8">
              <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b bg-slate-50">
                  <h3 className="text-sm font-black text-slate-800 uppercase">Explorador de Base de Datos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b">
                        {keys.map(k => (
                          <th key={k} className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                          {keys.map(k => (
                            <td key={k} className="px-4 py-3 text-xs text-slate-600 font-medium">
                              {typeof row[k] === 'number' ? row[k].toLocaleString() : String(row[k])}
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
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-4xl">📊</div>
            <h2 className="text-2xl font-black text-slate-800 uppercase">Listo para Analizar</h2>
            <p className="text-slate-500 max-w-sm font-medium">Sube un Excel con tus datos operativos para que la IA genere una propuesta visual inteligente.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;