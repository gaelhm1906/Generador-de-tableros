
import { DataRow, DashboardConfig, ColumnMapping } from '../types';
import { SOBSE_THEME, LOGOS } from '../constants';

export function generateExportableHtml(data: DataRow[], config: DashboardConfig, mapping: ColumnMapping): string {
  const dataJson = JSON.stringify(data);
  const configJson = JSON.stringify(config);
  const mappingJson = JSON.stringify(mapping);

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title} | SOBSE</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
        .card { background: white; border-radius: 2.5rem; border: 1px solid #f1f5f9; box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); }
        .guinda-bg { background-color: ${SOBSE_THEME.GUINDA}; }
    </style>
</head>
<body class="p-4 md:p-10">
    <main class="max-w-7xl mx-auto space-y-12">
        <div class="bg-slate-900 p-12 md:p-20 rounded-[3rem] text-white">
            <h1 class="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4">${config.title}</h1>
            <p class="text-xl text-slate-400 font-medium">${config.subtitle}</p>
        </div>

        <div id="kpis" class="grid grid-cols-1 md:grid-cols-4 gap-6"></div>
        <div id="sections" class="space-y-16"></div>
    </main>

    <script>
        const data = ${dataJson};
        const config = ${configJson};
        const mapping = ${mappingJson};

        const truncate = (str, n) => (str.length > n) ? str.slice(0, n - 1) + '...' : str;

        // Render KPIs
        const kpisDiv = document.getElementById('kpis');
        config.kpis.forEach(kpi => {
            const target = mapping[kpi.key] || kpi.key;
            const values = data.map(r => Number(r[target]) || 0);
            const val = kpi.format === 'percent' ? (values.reduce((a,b)=>a+b,0)/data.length) : values.reduce((a,b)=>a+b,0);
            const display = kpi.format === 'currency' ? '$' + val.toLocaleString() : kpi.format === 'percent' ? val.toFixed(1) + '%' : val.toLocaleString();
            
            const div = document.createElement('div');
            div.className = 'card p-8';
            div.innerHTML = \`<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">\${kpi.label}</p><p class="text-3xl font-black text-slate-900">\${display}</p>\`;
            kpisDiv.appendChild(div);
        });

        // Render Sections
        const secDiv = document.getElementById('sections');
        config.sections.forEach((section, sIdx) => {
            const s = document.createElement('section');
            s.className = 'space-y-8';
            s.innerHTML = \`<h2 class="text-3xl font-black text-slate-800 uppercase px-4">\${section.title}</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-8" id="s-\${sIdx}"></div>\`;
            secDiv.appendChild(s);

            section.charts.forEach((chart, cIdx) => {
                const cId = \`chart-\${sIdx}-\${cIdx}\`;
                const container = document.getElementById(\`s-\${sIdx}\`);
                const wrap = document.createElement('div');
                wrap.className = 'card p-10 h-[500px] flex flex-col';
                wrap.innerHTML = \`<h4 class="font-bold text-slate-800 mb-6">\${chart.title}</h4><div class="flex-1"><canvas id="\${cId}"></canvas></div>\`;
                container.appendChild(wrap);

                const dim = chart.dimension || mapping.category;
                const met = chart.metric || mapping.metric1;
                const chartData = {};
                data.forEach(r => {
                    const k = String(r[dim] || 'N/A');
                    chartData[k] = (chartData[k] || 0) + (Number(r[met]) || 0);
                });

                const labels = Object.keys(chartData).slice(0, 10);
                const values = labels.map(l => chartData[l]);

                new Chart(document.getElementById(cId), {
                    type: chart.type === 'pie' ? 'pie' : 'bar',
                    data: {
                        labels: labels.map(l => truncate(l, 15)),
                        datasets: [{
                            label: met,
                            data: values,
                            backgroundColor: chart.type === 'pie' ? ['#691C32', '#006341', '#C5A572', '#1e293b'] : '${SOBSE_THEME.GUINDA}',
                            borderRadius: 10
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: chart.type === 'pie' } },
                        scales: chart.type === 'pie' ? {} : {
                            x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
                            y: { beginAtZero: true }
                        }
                    }
                });
            });
        });
    </script>
</body>
</html>`;
}
