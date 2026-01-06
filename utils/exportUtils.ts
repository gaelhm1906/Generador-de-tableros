
import { TableStore, DashboardConfig, ColumnMapping } from '../types';
import { LOGOS, SOBSE_THEME } from '../constants';

export function generateExportableHtml(store: TableStore, config: DashboardConfig, mapping: ColumnMapping): string {
  const storeJson = JSON.stringify(store);
  const configJson = JSON.stringify(config);
  const d = new Date();
  const dateStr = `${d.getDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][d.getMonth()]} de ${d.getFullYear()}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title} | SOBSE</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 4rem; overflow-x: hidden; }
        .glass-card { background: white; border-radius: 4.5rem; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.03); }
        .banner { background-color: ${config.headerBgColor}; border-radius: 5rem; padding: 7rem; color: white; position: relative; overflow: hidden; }
        .inst-header { background: white; border-radius: 4rem; padding: 3rem 6rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rem; border: 1px solid #e2e8f0; }
        .logo-main { height: 100px; width: auto; }
        .logo-heart { height: 120px; width: auto; }
        canvas { max-height: 450px; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    </style>
</head>
<body>
    <main class="max-w-[1500px] mx-auto space-y-24">
        <div class="inst-header">
            <div class="flex items-center gap-16">
                <img src="${LOGOS.CDMX}" class="logo-main">
                <div style="width: 3px; height: 80px; background: #e2e8f0;"></div>
                <img src="${LOGOS.CORAZON}" class="logo-heart">
                <div>
                    <p style="font-size: 13px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.25em;">Secretaría de Obras y Servicios</p>
                    <h2 style="font-size: 32px; font-weight: 950; color: #0F172A; text-transform: uppercase; font-style: italic; tracking-tighter">SOBSE · Cerebro de Datos</h2>
                </div>
            </div>
            <div style="text-align: right;">
                <p style="font-size: 13px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.25em;">Reporte Ejecutivo Estratégico</p>
                <p style="font-size: 24px; font-weight: 950; color: #0F172A;">${dateStr}</p>
            </div>
        </div>

        <div class="banner">
            <div style="position: absolute; top: 0; right: 0; width: 600px; height: 600px; background: rgba(255,255,255,0.05); border-radius: 50%; filter: blur(80px); margin: -150px;"></div>
            <div class="relative z-10 space-y-6">
                <h1 class="text-[90px] font-[950] italic uppercase leading-[0.85] tracking-tighter mb-8">${config.title}</h1>
                <p class="text-3xl opacity-80 font-medium max-w-5xl italic leading-relaxed">${config.subtitle}</p>
            </div>
        </div>

        <div id="kpis" class="grid grid-cols-12 gap-10 px-2"></div>
        <div id="sections" class="space-y-24"></div>
    </main>

    <script>
        const store = ${storeJson};
        const config = ${configJson};
        const SOBSE_PALETTE = ['#691C32', '#006341', '#C5A572', '#0F172A', '#475569', '#94A3B8', '#1E293B', '#8B1C3F'];

        function getVal(v) { 
            if (typeof v === 'number') return v;
            return parseFloat(String(v || '0').replace(/[^0-9.-]+/g, "")) || 0; 
        }

        function formatDisplay(val, format) {
            if (format === 'currency') return '$ ' + val.toLocaleString();
            if (format === 'mdp') return '$ ' + (val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' MDP';
            if (format === 'percent') return val.toFixed(2) + '%';
            return val.toLocaleString();
        }
        
        const kpiCont = document.getElementById('kpis');
        config.kpis.forEach((k) => {
            const table = store[k.tableName] || Object.values(store)[0];
            if(!table) return;
            const isNum = table.columns[k.key]?.isMetric;
            const val = isNum ? table.rows.reduce((acc, r) => acc + getVal(r[k.key]), 0) : table.rows.length;
            
            const div = document.createElement('div');
            let spanClass = k.width === 'full' ? 'col-span-12' : (k.width === '1/2' ? 'col-span-12 md:col-span-6' : 'col-span-12 md:col-span-4');
            div.className = \`glass-card p-14 flex flex-col justify-between min-h-[280px] relative \${spanClass}\`;
            
            const color = k.statusColor || '#691C32';
            div.innerHTML = \`
                <div style="position: absolute; left:0; top:0; bottom:0; width: 14px; background: \${color};"></div>
                <div class="space-y-4">
                    <p class="text-[13px] font-[950] text-slate-400 uppercase tracking-[0.2em] mb-4">\${k.label}</p>
                    <p class="text-7xl font-[950] text-slate-900 tracking-tighter italic">\${formatDisplay(val, k.format)}</p>
                </div>
                \${k.statusLabel ? \`<p class="mt-10 text-[12px] font-black text-slate-500 uppercase italic opacity-60 tracking-widest">● \${k.statusLabel}</p>\` : ''}
            \`;
            kpiCont.appendChild(div);
        });

        const secCont = document.getElementById('sections');
        config.sections.forEach((s, sIdx) => {
            const wrap = document.createElement('div');
            wrap.className = "space-y-16";
            wrap.innerHTML = \`
                <div class="flex items-center gap-10 px-6 border-b-4 border-slate-50 pb-10">
                    <div class="w-4 h-16 bg-[#691C32] rounded-full"></div>
                    <h3 class="text-6xl font-[950] italic uppercase tracking-tighter text-slate-900">\${s.title}</h3>
                </div>
                <div id="sec-\${sIdx}" class="grid grid-cols-12 gap-16"></div>
            \`;
            secCont.appendChild(wrap);

            s.charts.forEach((c, cIdx) => {
                const chartDiv = document.createElement('div');
                const isFull = ['timeline', 'tour360', 'technicalFile', 'programFile', 'webview', 'line', 'table'].includes(c.type);
                chartDiv.className = \`glass-card p-20 \${isFull ? 'col-span-12' : 'col-span-12 lg:col-span-6'}\`;
                
                const table = store[c.tableName] || Object.values(store)[0];
                if(!table) return;

                if(c.type === 'technicalFile') {
                    const row = table.rows[0] || {};
                    const charKeys = Object.keys(row).slice(0,6);
                    chartDiv.innerHTML = \`
                        <div class="grid grid-cols-12 gap-20">
                            <div class="col-span-12 lg:col-span-6 space-y-12">
                                <h5 class="text-3xl font-[950] text-guinda uppercase italic border-b-4 border-slate-50 pb-8">DETALLES ESTRATÉGICOS</h5>
                                <div class="space-y-6">
                                    \${charKeys.map(k => \`<div class="flex justify-between py-6 border-b border-slate-50"><span class="font-black text-slate-400 uppercase text-[15px] italic tracking-tight shrink-0">\${k}</span><span class="font-black text-slate-900 text-[18px] ml-6 truncate">\${row[k]}</span></div>\`).join('')}
                                </div>
                            </div>
                            <div class="col-span-12 lg:col-span-6 flex flex-col justify-center items-center bg-slate-50 rounded-[4rem] p-16">
                                <p class="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-4">RESUMEN ACUMULADO</p>
                                <p class="text-8xl font-[950] text-slate-900 tracking-tighter italic">\${table.rows.length.toLocaleString()}</p>
                                <p class="text-[14px] font-black text-guinda uppercase mt-6 tracking-widest italic">Registros Totales</p>
                            </div>
                        </div>\`;
                } else if(c.type === 'table') {
                    const rows = table.rows.slice(0, 15);
                    const headCols = Object.keys(rows[0] || {}).slice(0, 6);
                    chartDiv.innerHTML = \`
                        <div class="space-y-12">
                            <h4 class="text-[38px] font-[950] italic uppercase text-slate-900 tracking-tighter">\${c.title}</h4>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left">
                                    <thead><tr class="border-b-2 border-slate-100">\${headCols.map(h => \`<th class="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">\${h}</th>\`).join('')}</tr></thead>
                                    <tbody class="divide-y divide-slate-50">\${rows.map(r => \`<tr>\${headCols.map(h => \`<td class="px-6 py-6 text-[14px] font-bold text-slate-700">\${r[h] || '---'}</td>\`).join('')}</tr>\`).join('')}</tbody>
                                </table>
                            </div>
                        </div>\`;
                } else if(c.type === 'webview') {
                    chartDiv.innerHTML = \`<iframe src="\${c.url}" style="width:100%; height:850px; border:none; border-radius:4.5rem; background:#f8fafc;"></iframe>\`;
                } else {
                    chartDiv.innerHTML = \`
                        <h4 class="text-[38px] font-[950] italic mb-3 uppercase text-slate-900 tracking-tighter">\${c.title}</h4>
                        <p class="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-16 italic opacity-60">Visualización de Control</p>
                        <div class="relative min-h-[450px]"><canvas id="can-\${sIdx}-\${cIdx}"></canvas></div>\`;
                }
                document.getElementById(\`sec-\${sIdx}\`).appendChild(chartDiv);
                
                if(document.getElementById(\`can-\${sIdx}-\${cIdx}\`)) {
                    const ctx = document.getElementById(\`can-\${sIdx}-\${cIdx}\`).getContext('2d');
                    const map = new Map();
                    table.rows.forEach(r => {
                        const k = String(r[c.dimension] || 'N/A');
                        map.set(k, (map.get(k) || 0) + getVal(r[c.metric]));
                    });
                    const sorted = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12);
                    
                    new Chart(ctx, {
                        type: c.type === 'pie' ? 'doughnut' : 'bar',
                        data: {
                            labels: sorted.map(e => e[0].length > 20 ? e[0].substring(0,17)+'...' : e[0]),
                            datasets: [{
                                label: c.metric,
                                data: sorted.map(e => e[1]),
                                backgroundColor: sorted.map((_, i) => SOBSE_PALETTE[i % SOBSE_PALETTE.length]),
                                borderRadius: 16,
                                borderWidth: 0
                            }]
                        },
                        options: { 
                            responsive: true, maintainAspectRatio: false,
                            plugins: { 
                                legend: { display: c.type === 'pie', position: 'bottom', labels: { font: { size: 11, weight: '900' }, padding: 30 } } 
                            },
                            scales: c.type === 'pie' ? {} : { 
                                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, weight: 'bold' } } }, 
                                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } } 
                            }
                        }
                    });
                }
            });
        });
    </script>
</body>
</html>`;
}
