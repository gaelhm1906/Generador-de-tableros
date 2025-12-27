
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { DataRow, TableStore, ColumnMetadata, DashboardConfig, ChartConfig, KPIConfig, DashboardSection } from './types';
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
        name: key,
        alias: key,
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
          if (rows.length > 0) newStore[`${file.name} - ${name}`] = { rows, columns: getColumnMetadata(rows) };
        });
      } catch (err) { console.error(err); }
    }
    setStore(newStore);
    if (Object.keys(newStore).length > 0) setSelectedTable(Object.keys(newStore)[0]);
    setLoading(false);
  };

  const updateColumnAlias = (tableName: string, colName: string, newAlias: string) => {
    setStore(prev => ({
      ...prev, [tableName]: { ...prev[tableName], columns: { ...prev[tableName].columns, [colName]: { ...prev[tableName].columns[colName], alias: newAlias } } }
    }));
  };

  const addKPI = () => {
    if (!editableConfig) return;
    const firstTable = Object.keys(store)[0];
    const firstKey = Object.keys(store[firstTable].columns)[0];
    const newKPI: KPIConfig = { label: "Nuevo Indicador", tableName: firstTable, key: firstKey, format: 'number', width: '1/4', statusLabel: 'Meta', statusColor: '#691C32' };
    setEditableConfig({ ...editableConfig, kpis: [...editableConfig.kpis, newKPI] });
  };

  const updateKPI = (idx: number, fields: Partial<KPIConfig>) => {
    if (!editableConfig) return;
    const kpis = [...editableConfig.kpis];
    if (Object.keys(fields).length === 0) kpis.splice(idx, 1);
    else kpis[idx] = { ...kpis[idx], ...fields };
    setEditableConfig({ ...editableConfig, kpis });
  };

  const addSection = () => {
    if (!editableConfig) return;
    setEditableConfig({ ...editableConfig, sections: [...editableConfig.sections, { title: "NUEVA SECCIÓN", description: "", charts: [] }] });
  };

  const updateSection = (sIdx: number, fields: Partial<DashboardSection>) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    sections[sIdx] = { ...sections[sIdx], ...fields };
    setEditableConfig({ ...editableConfig, sections });
  };

  const addChart = (sIdx: number, type: ChartConfig['type']) => {
    if (!editableConfig) return;
    const firstTable = Object.keys(store)[0];
    const cols = Object.keys(store[firstTable].columns);
    const dateCols = cols.filter(c => store[firstTable].columns[c].type === 'date');
    const newChart: ChartConfig = {
      id: `c-${Date.now()}`,
      type,
      tableName: firstTable,
      title: type === 'tour360' ? "Nuevo Tour 360" : "Nuevo Reporte",
      dimension: cols[0],
      metric: cols[1] || cols[0],
      metrics: [],
      url: (type === 'webview' || type === 'tour360') ? 'https://www.google.com/maps' : undefined,
      startDateCol: type === 'timeline' ? dateCols[0] : undefined,
      endDateCol: type === 'timeline' ? (dateCols[1] || dateCols[0]) : undefined,
      color: SOBSE_THEME.GUINDA,
    };
    const sections = [...editableConfig.sections];
    sections[sIdx].charts.push(newChart);
    setEditableConfig({ ...editableConfig, sections });
  };

  const updateChart = (sIdx: number, cIdx: number, fields: any) => {
    if (!editableConfig) return;
    const sections = [...editableConfig.sections];
    if (Object.keys(fields).length === 0) sections[sIdx].charts.splice(cIdx, 1);
    else sections[sIdx].charts[cIdx] = { ...sections[sIdx].charts[cIdx], ...fields };
    setEditableConfig({ ...editableConfig, sections });
  };

  const handleExport = () => {
    if (!editableConfig) return;
    const html = generateExportableHtml(store, editableConfig, { category: '', metric1: '', metric2: '' });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-sobse.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputBase = "bg-[#0F172A] border border-white/20 text-white text-[10px] p-2.5 rounded-xl outline-none focus:border-dorado transition-all w-full";
  const selectStyle = `${inputBase} appearance-none cursor-pointer font-bold`;

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="w-[420px] bg-[#111318] text-white flex flex-col shadow-2xl z-40 border-r border-white/5">
        <div className="p-8 bg-white border-b border-slate-200 flex items-center gap-3">
          <img src={LOGOS.CORAZON} alt="SOBSE" className="h-10 w-auto" />
          <div>
            <h1 className="text-[12px] font-[900] uppercase text-slate-900 leading-tight italic">Cerebro de Datos</h1>
            <p className="text-[8px] font-bold text-guinda uppercase tracking-widest opacity-60">SOBSE</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-7 space-y-8">
          {!editableConfig ? (
            <div className="space-y-6 animate-in fade-in">
              <label className="group block w-full p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] hover:border-guinda/50 hover:bg-white/[0.02] transition-all text-center cursor-pointer">
                <span className="text-2xl block mb-2">📂</span>
                <span className="text-[10px] font-black uppercase text-slate-300">Cargar Archivos</span>
                <input type="file" className="hidden" multiple onChange={e => e.target.files && processFiles(e.target.files)} />
              </label>
              {Object.keys(store).map(name => (
                <button key={name} onClick={() => setSelectedTable(name)} className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-bold border transition-all ${selectedTable === name ? 'bg-guinda border-guinda text-white shadow-xl' : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/5'}`}>
                  {name}
                </button>
              ))}
              {Object.keys(store).length > 0 && (
                <button onClick={() => {
                  const result = analyzeMultiTableData(store);
                  setEditableConfig({ ...result.suggestedConfig, headerBgColor: '#0F172A' });
                  setView('dashboard');
                }} className="w-full py-4 bg-guinda text-white font-[900] uppercase text-[11px] rounded-full shadow-2xl hover:scale-105 transition-all">Generar Dashboard</button>
              )}
            </div>
          ) : (
            <div className="space-y-10 pb-20 animate-in fade-in">
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Configurar KPIs</h4>
                  <button onClick={addKPI} className="text-[9px] font-black text-dorado bg-dorado/10 px-4 py-2 rounded-full hover:bg-dorado/20 transition-all">+ KPI</button>
                </div>
                {editableConfig.kpis.map((kpi, idx) => (
                  <div key={idx} className="bg-white/[0.04] p-6 rounded-3xl border border-white/10 space-y-4 relative group">
                    <button onClick={() => updateKPI(idx, {})} className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-all">✕</button>
                    <input value={kpi.label} onChange={e => updateKPI(idx, {label: e.target.value})} className="bg-transparent text-[11px] font-black text-white uppercase outline-none w-full border-b border-white/10 pb-1 focus:border-dorado" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Origen Datos</label>
                        <select value={kpi.tableName} onChange={e => updateKPI(idx, {tableName: e.target.value})} className={selectStyle}>
                          {Object.keys(store).map(tn => <option key={tn} value={tn}>{tn}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Métrica</label>
                        <select value={kpi.key} onChange={e => updateKPI(idx, {key: e.target.value})} className={selectStyle}>
                          {Object.keys(store[kpi.tableName]?.columns || {}).filter(c => store[kpi.tableName].columns[c].isMetric).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Visualizaciones</h4>
                  <button onClick={addSection} className="text-[9px] font-black text-white bg-emerald-600 px-4 py-2 rounded-full hover:bg-emerald-500 transition-colors">+ Sección</button>
                </div>
                {editableConfig.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="bg-white/[0.04] p-6 rounded-[2.5rem] border border-white/10 space-y-4">
                    <input value={sec.title} onChange={e => updateSection(sIdx, {title: e.target.value})} className="bg-transparent text-[11px] font-black text-white uppercase outline-none w-full border-b border-white/10 pb-2 focus:border-dorado" />
                    <div className="space-y-4">
                      {sec.charts.map((chart, cIdx) => (
                        <div key={chart.id} className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-4 relative group">
                          <button onClick={() => updateChart(sIdx, cIdx, {})} className="absolute top-2 right-2 text-white/10 hover:text-red-500 transition-all">✕</button>
                          
                          <div className="flex items-center gap-3">
                            <input type="color" value={chart.color} onChange={e => updateChart(sIdx, cIdx, {color: e.target.value})} className="w-5 h-5 rounded-full cursor-pointer bg-transparent" />
                            <input value={chart.title} onChange={e => updateChart(sIdx, cIdx, {title: e.target.value})} className="bg-transparent text-[10px] font-black text-slate-200 w-full outline-none focus:text-white" />
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Base de Datos</label>
                              <select value={chart.tableName} onChange={e => updateChart(sIdx, cIdx, {tableName: e.target.value})} className={selectStyle}>
                                {Object.keys(store).map(tn => <option key={tn} value={tn}>{tn}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Eje X (Categoría)</label>
                                <select value={chart.dimension} onChange={e => updateChart(sIdx, cIdx, {dimension: e.target.value})} className={selectStyle}>
                                  {Object.keys(store[chart.tableName]?.columns || {}).filter(c => store[chart.tableName].columns[c].isDimension).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Eje Y (Métrica)</label>
                                <select value={chart.metric} onChange={e => updateChart(sIdx, cIdx, {metric: e.target.value})} className={selectStyle}>
                                  {Object.keys(store[chart.tableName]?.columns || {}).filter(c => store[chart.tableName].columns[c].isMetric).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Tipo de Herramienta</label>
                            <select value={chart.type} onChange={e => updateChart(sIdx, cIdx, {type: e.target.value})} className={selectStyle}>
                              <option value="bar">📊 Barras Simple</option>
                              <option value="pie">⭕ Circular (Pay)</option>
                              <option value="line">📈 Líneas</option>
                              <option value="timeline">📅 Línea de Tiempo</option>
                              <option value="webview">🌐 Web Institucional</option>
                              <option value="tour360">🏙️ Recorrido 360</option>
                            </select>
                          </div>

                          {(chart.type === 'webview' || chart.type === 'tour360') && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <label className="text-[8px] font-black text-dorado uppercase ml-1">URL Enlace</label>
                                <input value={chart.url || ''} onChange={e => updateChart(sIdx, cIdx, {url: e.target.value})} placeholder="https://..." className={inputBase} />
                            </div>
                          )}

                          {chart.type === 'timeline' && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-dorado uppercase ml-1">Inicio</label>
                                  <select value={chart.startDateCol} onChange={e => updateChart(sIdx, cIdx, {startDateCol: e.target.value})} className={selectStyle}>
                                    {Object.keys(store[chart.tableName]?.columns || {}).filter(c => store[chart.tableName].columns[c].type === 'date').map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-dorado uppercase ml-1">Fin</label>
                                  <select value={chart.endDateCol} onChange={e => updateChart(sIdx, cIdx, {endDateCol: e.target.value})} className={selectStyle}>
                                    {Object.keys(store[chart.tableName]?.columns || {}).filter(c => store[chart.tableName].columns[c].type === 'date').map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addChart(sIdx, 'bar')} className="py-2.5 bg-white/5 text-[9px] font-black uppercase rounded-xl hover:bg-white/10 transition-all border border-white/10">+ Gráfico</button>
                      <button onClick={() => addChart(sIdx, 'tour360')} className="py-2.5 bg-dorado/10 text-[9px] font-black uppercase rounded-xl text-dorado hover:bg-dorado/20 border border-dorado/20 transition-all">+ Herramienta</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-[#0D0F13] border-t border-white/5 space-y-3">
          {editableConfig && (
            <>
              <button onClick={handleExport} className="w-full py-4 bg-emerald-600 text-white font-[900] uppercase text-[11px] rounded-full hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all">Exportar Reporte Final</button>
              <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                <button onClick={() => setView('dashboard')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-full ${view === 'dashboard' ? 'bg-white text-black shadow-md' : 'text-slate-500'}`}>Preview</button>
                <button onClick={() => setView('table')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-full ${view === 'table' ? 'bg-white text-black shadow-md' : 'text-slate-500'}`}>Datos</button>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-[#F8FAFC] scrollbar-hide">
        {loading && <div className="fixed inset-0 bg-white/80 z-[100] flex flex-col items-center justify-center animate-in fade-in"><div className="w-12 h-12 border-4 border-t-guinda rounded-full animate-spin" /></div>}
        {Object.keys(store).length > 0 ? (
          view === 'dashboard' && editableConfig ? (
            <div className="max-w-7xl mx-auto animate-in zoom-in-95 duration-500">
              <DashboardPreview store={store} config={editableConfig} mapping={{}} onUpdateConfig={setEditableConfig} />
            </div>
          ) : (
            <div className="h-full bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in slide-in-from-bottom-10">
               <div className="px-12 py-10 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                  <h3 className="text-3xl font-[900] text-slate-900 uppercase italic tracking-tighter">{selectedTable}</h3>
                  <p className="text-[10px] font-bold text-slate-400 italic uppercase tracking-widest opacity-60">Doble clic para editar ALIAS de las columnas</p>
               </div>
               <div className="flex-1 overflow-auto">
                 <table className="w-full text-left text-[11px]">
                   <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                     <tr>
                       {Object.keys(store[selectedTable]?.columns || {}).map(k => (
                         <th key={k} onDoubleClick={() => setEditingCol({ table: selectedTable, col: k })} className="px-10 py-7 font-black text-slate-400 uppercase group cursor-pointer hover:bg-slate-50 transition-colors">
                           {editingCol?.col === k ? (
                             <input autoFocus value={store[selectedTable].columns[k].alias || k} onChange={(e) => updateColumnAlias(selectedTable, k, e.target.value)} onBlur={() => setEditingCol(null)} className="border-2 border-guinda rounded-xl px-4 py-2 outline-none text-slate-900 w-full" />
                           ) : (
                             <div className="flex items-center justify-between">
                               <span className={store[selectedTable].columns[k].alias !== k ? 'text-guinda font-black' : ''}>{store[selectedTable].columns[k].alias || k}</span>
                               <span className="opacity-0 group-hover:opacity-100 text-guinda text-[12px]">✎</span>
                             </div>
                           )}
                         </th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {store[selectedTable]?.rows.slice(0, 100).map((r, i) => (
                       <tr key={i} className="hover:bg-slate-50 transition-colors">
                         {Object.keys(store[selectedTable].columns).map(k => <td key={k} className="px-10 py-5 text-slate-600 font-semibold border-r border-slate-50 last:border-r-0">{String(r[k] || '—')}</td>)}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-12 animate-in slide-in-from-bottom-5">
             <div className="space-y-10">
                <div className="flex justify-center items-center gap-12 opacity-40">
                   <img src={LOGOS.CDMX} alt="CDMX" className="h-24 w-auto grayscale" />
                   <div className="w-[1px] h-16 bg-slate-300"></div>
                   <img src="/assets/img/corazon-snfondo.png" alt="Corazón" className="h-28 w-auto grayscale" />
                </div>
                <h1 className="text-9xl font-[950] text-[#0F172A] italic uppercase leading-[0.85] tracking-tighter">
                   CEREBRO <span className="text-guinda">SOBSE</span>
                </h1>
                <p className="text-2xl text-slate-400 italic font-medium max-w-xl mx-auto">Centraliza, analiza y visualiza datos técnicos de obra.</p>
             </div>
             <label className="px-16 py-8 bg-[#691C32] text-white rounded-full font-black uppercase text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer">
                CARGAR ARCHIVOS
                <input type="file" className="hidden" multiple onChange={e => e.target.files && processFiles(e.target.files)} />
             </label>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
