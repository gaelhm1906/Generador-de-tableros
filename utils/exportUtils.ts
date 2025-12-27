
import { TableStore, DashboardConfig, ColumnMapping } from '../types';
import { LOGOS } from '../constants';

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
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 3rem; }
        .glass-card { background: white; border-radius: 3rem; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: transform 0.3s ease; }
        .banner { background-color: ${config.headerBgColor}; border-radius: 4rem; padding: 6rem; color: white; position: relative; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
        .inst-header { background: white; border-bottom: 1px solid #e2e8f0; border-radius: 3rem; padding: 2rem 4rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
        canvas { max-height: 400px; }
    </style>
</head>
<body>
    <main class="max-w-[1400px] mx-auto space-y-16">
        <div class="inst-header">
            <div class="flex items-center gap-8">
                <img src="${LOGOS.CORAZON}" style="height: 60px;">
                <div style="width: 1px; height: 40px; background: #e2e8f0;"></div>
                <div>
                    <p style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Secretaría de Obras y Servicios</p>
                    <h2 style="font-size: 20px; font-weight: 900; color: #0F172A; text-transform: uppercase; font-style: italic; tracking-tighter">SOBSE · Cerebro de Datos</h2>
                </div>
            </div>
            <div style="text-align: right;">
                <p style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Reporte Ejecutivo</p>
                <p style="font-size: 18px; font-weight: 900; color: #0F172A;">${dateStr}</p>
            </div>
        </div>

        <div class="banner">
            <div style="position: absolute; top: 0; right: 0; width: 400px; height: 400px; background: rgba(255,255,255,0.05); border-radius: 50%; filter: blur(60px); margin: -100px;"></div>
            <div class="relative z-10">
                <h1 class="text-8xl font-black italic uppercase leading-none tracking-tighter mb-8">${config.title}</h1>
                <p class="text-2xl opacity-80 font-medium max-w-3xl italic leading-relaxed">${config.subtitle}</p>
            </div>
        </div>

        <div id="kpis" class="grid grid-cols-12 gap-8 px-2"></div>
        <div id="sections" class="space-y-20"></div>
    </main>

    <script>
        const store = ${storeJson};
        const config = ${configJson};

        function getVal(v) { 
            if (typeof v === 'number') return v;
            return parseFloat(String(v || '0').replace(/[^0-9.-]+/g, "")) || 0; 
        }

        function formatDisplay(val, format) {
            if (format === 'currency') return '$ ' + val.toLocaleString();
            if (format === 'mdp') return '$ ' + (val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' MDP';
            if (format === 'percent') return val.toFixed(1) + '%';
            return val.toLocaleString();
        }
        
        // Render KPIs with variable widths
        const kpiCont = document.getElementById('kpis');
        config.kpis.forEach((k, idx) => {
            const table = store[k.tableName];
            const val = table ? table.rows.reduce((acc, r) => acc + getVal(r[k.key]), 0) : 0;
            
            const div = document.createElement('div');
            // Mapping widths to tailwind col-span
            let spanClass = "col-span-12 md:col-span-3"; // 1/4 default
            if(k.width === '1/2') spanClass = "col-span-12 md:col-span-6";
            if(k.width === 'full') spanClass = "col-span-12";
            
            div.className = \`glass-card p-12 flex flex-col justify-between min-h-[200px] relative \${spanClass}\`;
            
            const statusColor = k.statusColor || '#691C32';
            div.innerHTML = \`
                <div style="position: absolute; left:0; top:0; bottom:0; width: 10px; background: \${statusColor};"></div>
                <div>
                    <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-4">\${k.label}</p>
                    <p class="text-5xl font-black text-slate-900 tracking-tighter leading-none">\${formatDisplay(val, k.format)}</p>
                </div>
                \${k.statusLabel ? \`
                    <div class="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: \${statusColor}; box-shadow: 0 0 10px \${statusColor}44;"></span>
                        <p class="text-[10px] font-black text-slate-500 uppercase italic">\${k.statusLabel}</p>
                    </div>
                \` : ''}
            \`;
            kpiCont.appendChild(div);
        });

        // Render Sections and Charts
        const secCont = document.getElementById('sections');
        config.sections.forEach((s, sIdx) => {
            const wrap = document.createElement('div');
            wrap.className = "space-y-10";
            wrap.innerHTML = \`
                <div class="flex items-center gap-6 px-6 border-b border-slate-200 pb-6">
                    <div class="w-3 h-12 bg-guinda rounded-full shadow-lg"></div>
                    <h3 class="text-5xl font-black italic uppercase tracking-tighter text-slate-900">\${s.title}</h3>
                </div>
                <div id="sec-\${sIdx}" class="grid grid-cols-12 gap-10"></div>
            \`;
            secCont.appendChild(wrap);

            s.charts.forEach((c, cIdx) => {
                const chartDiv = document.createElement('div');
                const isFull = c.type === 'timeline' || c.type === 'multiBar' || c.type === 'line' || c.type === 'tour360';
                const spanClass = isFull ? 'col-span-12' : 'col-span-12 lg:col-span-6';
                
                chartDiv.className = \`glass-card p-12 min-h-[550px] flex flex-col \${spanClass}\`;
                
                if(c.type === 'tour360') {
                    chartDiv.innerHTML = \`
                        <div class="flex flex-col md:flex-row items-center gap-12">
                            <div class="flex-1 space-y-6">
                                <h4 class="text-4xl font-black italic text-guinda uppercase tracking-tighter">\${c.title}</h4>
                                <p class="text-slate-500 text-lg italic leading-relaxed">\${c.description || 'Recorrido visual interactivo.'}</p>
                                <a href="\${c.url}" target="_blank" style="display:inline-block; background: #691C32; color: white; padding: 1.25rem 2.5rem; border-radius: 3rem; font-weight: 900; text-transform: uppercase; text-decoration: none; font-size: 11px;">Abrir Recorrido 360°</a>
                            </div>
                            <div style="flex-shrink:0; width: 400px; aspect-ratio: 16/9; background: #f1f5f9; border-radius: 3rem; display: flex; align-items: center; justify-content: center; font-size: 40px;">🏙️</div>
                        </div>
                    \`;
                } else if(c.type === 'webview') {
                    chartDiv.innerHTML = \`
                        <h4 class="text-2xl font-black italic mb-8 uppercase text-slate-900 tracking-tighter">\${c.title}</h4>
                        <iframe src="\${c.url}" class="flex-1 rounded-[3rem] border-none bg-slate-50 shadow-inner min-h-[400px]"></iframe>
                    \`;
                } else {
                    chartDiv.innerHTML = \`
                        <h4 class="text-2xl font-black italic mb-2 uppercase text-slate-900 tracking-tighter">\${c.title}</h4>
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-10 italic">Visualización dinámica de datos</p>
                        <div class="flex-1 relative"><canvas id="can-\${sIdx}-\${cIdx}"></canvas></div>
                    \`;
                }
                document.getElementById(\`sec-\${sIdx}\`).appendChild(chartDiv);
                
                if(c.type !== 'webview' && c.type !== 'tour360') {
                    const ctx = document.getElementById(\`can-\${sIdx}-\${cIdx}\`).getContext('2d');
                    const tbl = store[c.tableName];
                    const map = new Map();
                    const metricKeys = [c.metric, ...(c.metrics || [])];
                    
                    tbl.rows.forEach(r => {
                        const key = String(r[c.dimension] || 'N/A');
                        if(!map.has(key)) {
                            const initial = {};
                            metricKeys.forEach(mk => initial[mk] = 0);
                            map.set(key, initial);
                        }
                        const node = map.get(key);
                        metricKeys.forEach(mk => node[mk] += getVal(r[mk]));
                    });
                    
                    const sortedEntries = Array.from(map.entries()).sort((a,b)=>b[1][c.metric] - a[1][c.metric]).slice(0, 10);
                    const labels = sortedEntries.map(e => e[0]);
                    
                    const datasets = metricKeys.map((mk, i) => {
                        const alias = store[c.tableName].columns[mk]?.alias || mk;
                        const colors = [c.color, '#006341', '#C5A572', '#1E293B'];
                        const color = colors[i % colors.length];
                        
                        return {
                            label: alias,
                            data: sortedEntries.map(e => e[1][mk]),
                            backgroundColor: color,
                            borderColor: color,
                            borderWidth: c.type === 'line' ? 4 : 0,
                            borderRadius: c.type === 'pie' ? 0 : 12,
                            type: c.type === 'line' ? 'line' : (c.type === 'pie' ? 'doughnut' : 'bar'),
                            fill: false,
                            tension: 0.4
                        };
                    });

                    new Chart(ctx, {
                        type: c.type === 'pie' ? 'doughnut' : 'bar',
                        data: { labels, datasets },
                        options: { 
                            responsive: true, 
                            maintainAspectRatio: false, 
                            plugins: { 
                                legend: { 
                                    position: 'top', 
                                    align: 'end',
                                    labels: { font: { size: 10, weight: 'bold' }, padding: 20, usePointStyle: true } 
                                } 
                            },
                            scales: c.type === 'pie' ? {} : {
                                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 9, weight: 'bold' } } },
                                x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } }
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
