
import { TableStore, DashboardConfig, ColumnMapping } from '../types';
import { SOBSE_THEME, LOGOS } from '../constants';

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
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f1f5f9; color: #1e293b; padding: 4rem; }
        .glass-card { background: white; border-radius: 3rem; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
        .banner { background-color: ${config.headerBgColor}; border-radius: 4rem; padding: 6rem; color: white; position: relative; overflow: hidden; }
        .inst-header { background: white; border-bottom: 1px solid #e2e8f0; border-radius: 3rem 3rem 0 0; padding: 2rem 3rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    </style>
</head>
<body>
    <main class="max-w-7xl mx-auto space-y-12">
        <div class="inst-header">
            <div class="flex items-center gap-6">
                <img src="${LOGOS.CORAZON}" style="height: 60px;">
                <div style="width: 1px; height: 40px; background: #e2e8f0;"></div>
                <div>
                    <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Secretaría de Obras y Servicios</p>
                    <h2 style="font-size: 16px; font-weight: 900; color: #0F172A; text-transform: uppercase; font-style: italic;">SOBSE · Cerebro de Datos</h2>
                </div>
            </div>
            <div style="text-align: right;">
                <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Reporte Consolidado</p>
                <p style="font-size: 16px; font-weight: 900; color: #0F172A;">${dateStr}</p>
            </div>
        </div>

        <div class="banner shadow-2xl">
            <h1 class="text-7xl font-black italic uppercase leading-none mb-6">${config.title}</h1>
            <p class="text-xl opacity-70 font-medium max-w-2xl">${config.subtitle}</p>
        </div>

        <div id="kpis" class="grid grid-cols-1 md:grid-cols-4 gap-8"></div>
        <div id="sections" class="space-y-16"></div>
    </main>

    <script>
        const store = ${storeJson};
        const config = ${configJson};

        function getVal(v) { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]+/g, "")) || 0; }
        
        // Render KPIs
        const kpiCont = document.getElementById('kpis');
        config.kpis.forEach(k => {
            const table = store[k.tableName];
            const val = table ? table.rows.reduce((acc, r) => acc + getVal(r[k.key]), 0) : 0;
            const div = document.createElement('div');
            div.className = 'glass-card p-10 flex flex-col justify-between min-h-[180px]';
            div.innerHTML = \`<p class="text-[10px] font-extrabold text-slate-400 uppercase">\${k.label}</p>
                             <p class="text-4xl font-black text-slate-900 tracking-tighter">
                                \${k.format === 'currency' ? '$' + val.toLocaleString() : val.toLocaleString()}
                             </p>\`;
            kpiCont.appendChild(div);
        });

        // Render Sections
        const secCont = document.getElementById('sections');
        config.sections.forEach((s, sIdx) => {
            const wrap = document.createElement('div');
            wrap.className = "space-y-8";
            wrap.innerHTML = \`<div class="flex items-center gap-4 px-4">
                                <div class="w-2 h-10 bg-guinda rounded-full"></div>
                                <h3 class="text-3xl font-black italic uppercase">\${s.title}</h3>
                               </div>
                               <div id="sec-\${sIdx}" class="grid grid-cols-1 lg:grid-cols-2 gap-8"></div>\`;
            secCont.appendChild(wrap);

            s.charts.forEach((c, cIdx) => {
                const chartDiv = document.createElement('div');
                chartDiv.className = 'glass-card p-10 min-h-[500px] flex flex-col';
                if(c.type === 'webview') {
                    chartDiv.innerHTML = \`<h4 class="text-xl font-black italic mb-6 uppercase">\${c.title}</h4>
                                         <iframe src="\${c.url}" class="flex-1 rounded-3xl border-none bg-slate-50"></iframe>\`;
                } else {
                    chartDiv.innerHTML = \`<h4 class="text-xl font-black italic mb-4 uppercase">\${c.title}</h4>
                                         <div class="flex-1 relative"><canvas id="can-\${sIdx}-\${cIdx}"></canvas></div>\`;
                }
                document.getElementById(\`sec-\${sIdx}\`).appendChild(chartDiv);
                
                if(c.type !== 'webview') {
                    const ctx = document.getElementById(\`can-\${sIdx}-\${cIdx}\`).getContext('2d');
                    const tbl = store[c.tableName];
                    const map = new Map();
                    tbl.rows.forEach(r => {
                        const key = String(r[c.dimension] || 'N/A');
                        map.set(key, (map.get(key) || 0) + getVal(r[c.metric]));
                    });
                    const data = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
                    new Chart(ctx, {
                        type: c.type === 'pie' ? 'doughnut' : 'bar',
                        data: {
                            labels: data.map(e => e[0]),
                            datasets: [{
                                label: c.metric,
                                data: data.map(e => e[1]),
                                backgroundColor: c.color,
                                borderRadius: 10
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: c.type==='pie' } } }
                    });
                }
            });
        });
    </script>
</body>
</html>`;
}
