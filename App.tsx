
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { DataRow, TableStore, ColumnMetadata, ColumnMapping, DashboardConfig, ChartConfig, DashboardSection } from './types';
import { analyzeMultiTableData } from './services/localAnalysisService';
import { LOGOS, SOBSE_THEME } from './constants';
import DashboardPreview from './components/DashboardPreview';
import { generateExportableHtml } from './utils/exportUtils';

const App: React.FC = () => {
  const [store, setStore] = useState<TableStore>({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'table'>('table');
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [editingCol, setEditingCol] = useState<{ table: string, col: string } | null>(null);
  
  const [editableConfig, setEditableConfig] = useState<DashboardConfig | null>(null);
  const [activeMapping] = useState<ColumnMapping>({ category: '', metric1: '', metric2: '' });

  const getColumnMetadata = (rows: DataRow[]): { [key: string]: ColumnMetadata } => {
    const cols: { [key: string]: ColumnMetadata } = {};
    if (rows.length === 0) return cols;
    const sample = rows.slice(0, 50);
    const keys = Object.keys(rows[0]);
    keys.forEach(key => {
      const values = sample.map(r => r[key]);
      const uniqueValues = new Set(values).size;
      const isNumeric = values.every(v => v === null || v === undefined || !isNaN(parseFloat(String(v).replace(/[^0-9.-]+/g, ""))));
      const isDate = values.every(v => v === null || v === undefined || !isNaN(Date.parse(String(v))));
      
      cols[key] = {
        name: key,
        alias: key,
        type: isNumeric ? 'number' : (isDate ? 'date' : 'text'),
        uniqueRatio: uniqueValues / sample.length,
        isMetric: isNumeric,
        isDimension: !isNumeric && !isDate && uniqueValues > 1 && uniqueValues < 50,
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
          const data = Array.isArray(json) ? json : (json[Object.keys(json)[0]] || []);
          newStore[file.name] = { rows: data, columns: getColumnMetadata(data) };
        } else {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer);
          wb.SheetNames.forEach(name => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name]) as DataRow[];
            const tableName = `${file.name} - ${name}`;
            if (rows.length > 0) newStore[tableName] = { rows, columns: getColumnMetadata(rows) };
          });
        }
      } catch (err) { console.error(err); }
    }
    setStore(newStore);
    const tables = Object.keys(newStore);
    if (tables.length > 0 && !selectedTable) setSelectedTable(tables[0]);
    setLoading(false);
  };

  const updateColumnAlias = (tableName: string, colName: string, newAlias: string) => {
    setStore(prev => ({
      ...prev,
      [tableName]: {
        ...prev[tableName],
        columns: {
          ...prev[tableName].columns,
          [colName]: { ...prev[tableName].columns[colName], alias: newAlias }
        }
      }
    }));
  };

  const runAnalysis = () => {
    if (Object.keys(store).length === 0) return;
    setLoading(true);
    setTimeout(() => {
      try {
        const result = analyzeMultiTableData(store);
        const finalConfig: DashboardConfig = {
          ...result.suggestedConfig,
          headerBgColor: '#0F172A'
        };
        setEditableConfig(finalConfig);
        setView('dashboard');
      } catch (e) {
        alert("Error al analizar datos.");
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  const updateKPI = (idx: number, fields: any) => {
    if (!editableConfig) return;
    const kpis = [...editableConfig.kpis];
    kpis[idx] = { ...kpis[idx], ...fields };
    setEditableConfig({ ...editableConfig, kpis });
  };

  const addKPI = () => {
    if (!editableConfig) return;
    const firstTable = Object.keys(store)[0];
    const firstKey = Object.keys(store[firstTable].columns)[0];
    setEditableConfig({ 
      ...editableConfig, 
      kpis: [...editableConfig.kpis, { label: "Nuevo Indicador", tableName: firstTable, key: firstKey, format: 'number', statusLabel: 'Estatus actual', statusColor: '#006341' }] 
    });
  };

  const addSection = () => {
    if (!editableConfig) return;
    setEditableConfig({ ...editableConfig, sections: [...editableConfig.sections, { title: "Nueva Sección", description: "Descripción", charts: [] }] });
  };

  const updateSection = (sIdx: number, fields: any) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections[sIdx] = { ...sections[sIdx], ...fields };
    setEditableConfig({ ...editableConfig, sections });
  };

  const addChart = (sIdx: number, type: ChartConfig['type'] = 'bar') => {
    if (!editableConfig) return;
    const firstTable = Object.keys(store)[0];
    const cols = Object.keys(store[firstTable].columns);
    const newChart: ChartConfig = {
      id: `c-${Date.now()}`,
      type: type,
      tableName: firstTable,
      title: type === 'tour360' ? "Visualiza las UTOPÍAS" : (type === 'webview' ? "Vista Web" : "Módulo Nuevo"),
      dimension: cols[0],
      metric: cols[1] || cols[0],
      metricLine: type === 'combo' ? cols[2] || cols[1] : undefined,
      color: type === 'tour360' ? '#691C32' : SOBSE_THEME.GUINDA,
      color2: type === 'combo' ? SOBSE_THEME.DORADO : undefined,
      url: type === 'webview' || type === 'tour360' ? "https://" : "",
      previewUrl: type === 'tour360' ? "https://via.placeholder.com/600x400" : ""
    };
    const sections = [...editableConfig.sections];
    sections[sIdx].charts.push(newChart);
    setEditableConfig({ ...editableConfig, sections });
  };

  const updateChart = (sIdx: number, cIdx: number, fields: any) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections[sIdx].charts[cIdx] = { ...sections[sIdx].charts[cIdx], ...fields };
    setEditableConfig({ ...editableConfig, sections });
  };

  const handleExport = () => {
    if (!editableConfig || Object.keys(store).length === 0) return;
    const html = generateExportableHtml(store, editableConfig, { category: '', metric1: '', metric2: '' });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOBSE_Tablero.html`;
    a.click();
  };

  const tableNames = Object.keys(store);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="w-[420px] bg-[#111318] text-white flex flex-col shadow-2xl z-40 border-r border-white/5">
        <div className="p-8 bg-white border-b border-slate-200">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200">
              <img src={LOGOS.CORAZON} alt="SOBSE" className="w-full h-full object-contain scale-75" />
            </div>
            <div>
              <h1 className="text-[13px] font-black uppercase text-slate-900 leading-tight">Cerebro SOBSE</h1>
              <p className="text-[9px] font-bold text-guinda uppercase tracking-widest opacity-80">Arquitectura de Datos</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-7 space-y-10">
          {!editableConfig ? (
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Carga de Fuentes</h3>
              <label className="block w-full p-8 border-2 border-dashed border-white/10 rounded-[2rem] hover:border-guinda/50 hover:bg-white/[0.02] transition-all text-center cursor-pointer">
                <span className="text-[11px] font-black uppercase text-slate-300 block mb-1">Subir Archivos</span>
                <input type="file" className="hidden" multiple onChange={e => e.target.files && processFiles(e.target.files)} />
              </label>
              <div className="space-y-3">
                {tableNames.map(name => (
                  <button key={name} onClick={() => setSelectedTable(name)} className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-bold border transition-all ${selectedTable === name ? 'bg-guinda border-guinda text-white shadow-lg' : 'bg-white/[0.03] border-white/5 text-slate-400'}`}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10 pb-20">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Configuración General</h4>
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-4">
                  <input value={editableConfig.title} onChange={e => setEditableConfig({...editableConfig, title: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-[11px] font-bold text-white outline-none" />
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-500 uppercase">Fondo Banner</span>
                    <input type="color" value={editableConfig.headerBgColor} onChange={e => setEditableConfig({...editableConfig, headerBgColor: e.target.value})} className="w-8 h-8 rounded-full overflow-hidden bg-transparent border-none cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                 <div className="flex justify-between items-center px-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Indicadores (KPIs)</h4>
                    <button onClick={addKPI} className="text-[9px] font-black text-guinda bg-white px-3 py-1.5 rounded-full">+ KPI</button>
                 </div>
                 {editableConfig.kpis.map((kpi, idx) => (
                   <div key={idx} className="bg-white/[0.02] p-5 rounded-[1.5rem] border border-white/5 space-y-3 relative group">
                      <button onClick={() => updateKPI(idx, {})} className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100">✕</button>
                      <input value={kpi.label} onChange={e => updateKPI(idx, {label: e.target.value})} className="bg-transparent text-[11px] font-black text-emerald-400 w-full outline-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={kpi.key} onChange={e => updateKPI(idx, {key: e.target.value})} className="bg-black/40 text-[9px] p-2 rounded-xl border-none text-slate-400">
                          {Object.keys(store[kpi.tableName]?.columns || {}).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={kpi.format} onChange={e => updateKPI(idx, {format: e.target.value})} className="bg-black/40 text-[9px] p-2 rounded-xl border-none text-slate-400">
                          <option value="number">Número</option>
                          <option value="currency">Moneda</option>
                          <option value="mdp">MDP</option>
                          <option value="percent">Porcentaje</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                         <input type="color" value={kpi.statusColor || '#691C32'} onChange={e => updateKPI(idx, {statusColor: e.target.value})} className="w-5 h-5 rounded-full bg-transparent border-none" />
                         <input value={kpi.statusLabel || ''} onChange={e => updateKPI(idx, {statusLabel: e.target.value})} className="bg-black/20 text-[9px] p-2 rounded-lg w-full text-slate-400" placeholder="Estatus (Meta)" />
                      </div>
                   </div>
                 ))}
              </div>

              <div className="space-y-8">
                 <div className="flex justify-between items-center px-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bloques Visuales</h4>
                    <button onClick={addSection} className="text-[9px] font-black text-white bg-emerald-600 px-3 py-1.5 rounded-full">+ Sección</button>
                 </div>
                 {editableConfig.sections.map((sec, sIdx) => (
                   <div key={sIdx} className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 space-y-4">
                      <input value={sec.title} onChange={e => updateSection(sIdx, {title: e.target.value})} className="bg-transparent text-[11px] font-black text-white uppercase outline-none w-full border-b border-white/10 pb-1" />
                      {sec.charts.map((chart, cIdx) => (
                        <div key={chart.id} className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2 group relative">
                           <div className="flex items-center gap-2">
                             <input type="color" value={chart.color} onChange={e => updateChart(sIdx, cIdx, {color: e.target.value})} className="w-4 h-4 rounded-full" />
                             <input value={chart.title} onChange={e => updateChart(sIdx, cIdx, {title: e.target.value})} className="bg-transparent text-[10px] font-bold text-slate-300 w-full outline-none" />
                           </div>
                           <select value={chart.type} onChange={e => updateChart(sIdx, cIdx, {type: e.target.value})} className="w-full bg-slate-800 text-[9px] p-2 rounded-lg text-slate-300 outline-none">
                              <option value="bar">Barras</option>
                              <option value="combo">Seguimiento (Avance)</option>
                              <option value="pie">Circular</option>
                              <option value="webview">Vista Web</option>
                              <option value="tour360">Tour 360 / Render</option>
                           </select>
                           {chart.type === 'webview' && (
                             <input value={chart.url || ''} onChange={e => updateChart(sIdx, cIdx, {url: e.target.value})} placeholder="URL de Iframe..." className="bg-slate-800 text-[9px] p-2 rounded-lg w-full text-blue-300" />
                           )}
                           {chart.type === 'combo' && (
                             <select value={chart.metricLine} onChange={e => updateChart(sIdx, cIdx, {metricLine: e.target.value})} className="w-full bg-slate-800 text-[9px] p-2 rounded-lg text-slate-400">
                                {Object.keys(store[chart.tableName]?.columns || {}).map(c => <option key={c} value={c}>Línea: {c}</option>)}
                             </select>
                           )}
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => addChart(sIdx, 'bar')} className="py-2 bg-white/5 text-[8px] font-bold rounded-lg hover:bg-white/10 transition-all">+ Gráfica</button>
                        <button onClick={() => addChart(sIdx, 'webview')} className="py-2 bg-blue-500/10 text-[8px] font-bold rounded-lg text-blue-400 hover:bg-blue-500/20">+ Web</button>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-[#0D0F13] border-t border-white/5 space-y-4">
          {!editableConfig ? (
            <button onClick={runAnalysis} className="w-full py-4 bg-guinda text-white font-black uppercase text-[11px] rounded-full shadow-lg">Analizar Datos</button>
          ) : (
            <button onClick={handleExport} className="w-full py-4 bg-emerald-600 text-white font-black uppercase text-[11px] rounded-full shadow-lg">Exportar Reporte</button>
          )}
          <div className="flex bg-white/5 p-1 rounded-full">
            <button onClick={() => setView('dashboard')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-full transition-all ${view === 'dashboard' ? 'bg-white text-black shadow-md' : 'text-slate-500'}`}>Visualizar</button>
            <button onClick={() => setView('table')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-full transition-all ${view === 'table' ? 'bg-white text-black shadow-md' : 'text-slate-500'}`}>Datos</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-slate-50 relative scrollbar-hide">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-guinda rounded-full animate-spin" />
            <p className="mt-4 text-sm font-black text-slate-900 uppercase italic">Procesando Arquitectura...</p>
          </div>
        )}

        {tableNames.length > 0 ? (
          view === 'dashboard' && editableConfig ? (
            <div className="max-w-6xl mx-auto"><DashboardPreview store={store} config={editableConfig} mapping={{category:'', metric1:'', metric2:''}} /></div>
          ) : (
            <div className="h-full bg-white rounded-[3rem] shadow-xl overflow-hidden flex flex-col border border-slate-200">
               <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                 <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter truncate max-w-xl">{selectedTable}</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase italic">Tip: Haz doble clic en el encabezado para cambiar el alias</p>
               </div>
               <div className="flex-1 overflow-auto scrollbar-hide">
                 <table className="w-full text-left text-[11px]">
                   <thead className="sticky top-0 bg-white z-10 shadow-sm">
                     <tr>
                       {Object.keys(store[selectedTable]?.columns || {}).map(k => {
                         const col = store[selectedTable].columns[k];
                         const isEditing = editingCol?.table === selectedTable && editingCol?.col === k;
                         
                         return (
                           <th key={k} 
                               onDoubleClick={() => setEditingCol({ table: selectedTable, col: k })}
                               className="px-8 py-5 font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100 group cursor-pointer hover:bg-slate-50 transition-all">
                             {isEditing ? (
                               <input 
                                 autoFocus
                                 value={col.alias || k}
                                 onChange={(e) => updateColumnAlias(selectedTable, k, e.target.value)}
                                 onBlur={() => setEditingCol(null)}
                                 onKeyDown={(e) => e.key === 'Enter' && setEditingCol(null)}
                                 className="bg-slate-100 border border-guinda rounded px-2 py-1 text-slate-900 w-full outline-none"
                               />
                             ) : (
                               <div className="flex items-center gap-2">
                                 <span className={col.alias !== k ? 'text-guinda' : ''}>{col.alias || k}</span>
                                 <span className="opacity-0 group-hover:opacity-100 text-[8px] text-guinda">✎</span>
                               </div>
                             )}
                           </th>
                         );
                       })}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {store[selectedTable]?.rows.slice(0, 100).map((r, i) => (
                       <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                         {Object.keys(store[selectedTable].columns).map(k => (
                           <td key={k} className="px-8 py-4 text-slate-600 font-medium">{String(r[k] || '—')}</td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-12">
             <img src={LOGOS.CORAZON} className="h-40 opacity-20 grayscale" />
             <div className="space-y-4">
               <h1 className="text-8xl font-black text-slate-900 uppercase tracking-tighter leading-none">Cerebro <span className="text-guinda italic">SOBSE</span></h1>
               <p className="text-2xl text-slate-400 italic">Centraliza, analiza y visualiza datos técnicos de obra.</p>
             </div>
             <label className="px-16 py-8 bg-guinda text-white rounded-full font-black uppercase text-xl shadow-2xl hover:scale-105 transition-all cursor-pointer">Cargar Archivos<input type="file" className="hidden" multiple onChange={e => e.target.files && processFiles(e.target.files)} /></label>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
