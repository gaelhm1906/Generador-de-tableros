
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
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --guinda: ${SOBSE_THEME.GUINDA};
            --verde: ${SOBSE_THEME.VERDE};
            --dorado: ${SOBSE_THEME.DORADO};
        }
        body { 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            background: radial-gradient(circle at top left, #ffffff, #f1f5f9);
            min-height: 100vh;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 2rem;
            box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05);
        }
        .tab-active {
            background: var(--guinda) !important;
            color: white !important;
            box-shadow: 0 10px 15px -3px rgba(105, 28, 50, 0.2);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
    </style>
</head>
<body class="p-6 md:p-12">
    <main class="max-w-7xl mx-auto space-y-12">
        <!-- Header -->
        <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div class="flex items-center gap-6">
                <img src="${LOGOS.CDMX}" class="h-10 opacity-80" />
                <div class="w-px h-10 bg-slate-200"></div>
                <img src="${LOGOS.SOBSE}" class="h-10" />
            </div>
            <div class="text-right">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gobierno de la Ciudad de México</p>
                <h1 class="text-xl font-black italic uppercase text-slate-900">${config.title}</h1>
            </div>
        </header>

        <!-- Banner -->
        <div class="bg-slate-900 p-12 md:p-20 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
            <div class="absolute top-0 right-0 w-96 h-96 bg-guinda/20 rounded-full blur-[100px] -mr-20 -mt-20"></div>
            <div class="relative z-10">
                <h2 class="text-4xl md:text-6xl font-black tracking-tighter mb-4 italic">${config.title}</h2>
                <p class="text-lg md:text-xl text-slate-400 font-medium">${config.subtitle}</p>
            </div>
        </div>

        <!-- KPIs -->
        <div id="kpis" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"></div>

        <!-- Charts Global -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="glass-card p-10 h-[450px] flex flex-col">
                <h3 id="chart1-title" class="text-lg font-black uppercase italic text-slate-800 mb-6">Inversión por Agrupador</h3>
                <div class="flex-1"><canvas id="globalChart1"></canvas></div>
            </div>
            <div class="glass-card p-10 h-[450px] flex flex-col">
                <h3 id="chart2-title" class="text-lg font-black uppercase italic text-slate-800 mb-6">Distribución Relativa</h3>
                <div class="flex-1"><canvas id="globalChart2"></canvas></div>
            </div>
        </div>

        <!-- EXPLORADOR DETALLADO (ESTILO CUADRILLAS) -->
        <section class="space-y-6">
            <div class="flex items-center gap-4 px-4">
                <div class="h-8 w-2 bg-guinda rounded-full"></div>
                <h2 class="text-2xl font-black text-slate-800 uppercase italic">Explorador Detallado</h2>
            </div>
            
            <div class="glass-card overflow-hidden flex flex-col min-h-[800px]">
                <!-- Tabs -->
                <div id="tabs-container" class="flex gap-2 p-6 bg-slate-50/50 border-b border-slate-100 overflow-x-auto scrollbar-hide"></div>
                
                <!-- Tab Detail Content -->
                <div class="p-10 space-y-10">
                    <div id="tab-kpis" class="grid grid-cols-1 md:grid-cols-3 gap-6"></div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="h-[400px] flex flex-col"><canvas id="tabChart1"></canvas></div>
                        <div class="h-[400px] flex flex-col"><canvas id="tabChart2"></canvas></div>
                    </div>

                    <!-- Filter & Table -->
                    <div class="pt-10 border-t border-slate-100 space-y-6">
                        <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <input type="text" id="table-search" placeholder="Buscar concepto..." class="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm w-full md:w-96 focus:ring-2 focus:ring-guinda outline-none" />
                            <div id="table-filters" class="flex gap-2"></div>
                        </div>
                        <div class="overflow-x-auto rounded-3xl border border-slate-100">
                            <table class="w-full text-left text-sm">
                                <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <tr id="table-header"></tr>
                                </thead>
                                <tbody id="table-body" class="divide-y divide-slate-50"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <script>
        const data = ${dataJson};
        const config = ${configJson};
        const mapping = ${mappingJson};

        let currentTab = "";
        let charts = {};

        const fmt = {
            currency: (v) => '$' + Number(v).toLocaleString('es-MX', {maximumFractionDigits:0}),
            number: (v) => Number(v).toLocaleString('es-MX'),
            percent: (v) => Number(v).toFixed(1) + '%'
        };

        function init() {
            renderGlobalKPIs();
            renderGlobalCharts();
            renderTabs();
            if (data.length > 0) {
                const firstVal = data[0][mapping.category];
                switchTab(firstVal);
            }
        }

        function renderGlobalKPIs() {
            const container = document.getElementById('kpis');
            config.kpis.forEach(kpi => {
                const col = mapping[kpi.key] || kpi.key;
                const total = data.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
                const display = kpi.format === 'currency' ? fmt.currency(total) : fmt.number(total);
                
                const div = document.createElement('div');
                div.className = 'glass-card p-8 border-l-8 border-l-guinda';
                div.innerHTML = \`
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">\${kpi.label}</p>
                    <p class="text-3xl font-black text-slate-900">\${display}</p>
                \`;
                container.appendChild(div);
            });
        }

        function renderGlobalCharts() {
            const dim = mapping.category;
            const met = mapping.metric1;
            
            const grouped = {};
            data.forEach(r => {
                const k = r[dim] || "N/A";
                grouped[k] = (grouped[k] || 0) + (Number(r[met]) || 0);
            });

            const labels = Object.keys(grouped).sort((a,b) => grouped[b] - grouped[a]).slice(0, 10);
            const values = labels.map(l => grouped[l]);

            new Chart(document.getElementById('globalChart1'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{ label: met, data: values, backgroundColor: 'rgba(105, 28, 50, 0.8)', borderRadius: 12 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });

            new Chart(document.getElementById('globalChart2'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{ data: values, backgroundColor: ['#691C32', '#006341', '#C5A572', '#2D2F39', '#475569'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        function renderTabs() {
            const container = document.getElementById('tabs-container');
            const unique = [...new Set(data.map(r => r[mapping.category]))].sort();
            
            unique.forEach(val => {
                const btn = document.createElement('button');
                btn.className = "px-6 py-3 bg-white text-slate-500 font-bold text-xs rounded-2xl whitespace-nowrap transition-all hover:bg-slate-100";
                btn.textContent = val;
                btn.onclick = () => switchTab(val);
                btn.id = "tab-" + val.replace(/\\s/g, '-');
                container.appendChild(btn);
            });
        }

        function switchTab(val) {
            currentTab = val;
            document.querySelectorAll('#tabs-container button').forEach(b => b.classList.remove('tab-active'));
            const activeBtn = document.getElementById("tab-" + val.replace(/\\s/g, '-'));
            if (activeBtn) activeBtn.classList.add('tab-active');

            const filtered = data.filter(r => r[mapping.category] === val);
            renderTabKPIs(filtered);
            renderTabCharts(filtered);
            renderTable(filtered);
        }

        function renderTabKPIs(rows) {
            const container = document.getElementById('tab-kpis');
            container.innerHTML = "";
            config.kpis.forEach((kpi, i) => {
                const col = mapping[kpi.key] || kpi.key;
                const total = rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
                const display = kpi.format === 'currency' ? fmt.currency(total) : fmt.number(total);
                
                const div = document.createElement('div');
                div.className = 'p-6 bg-slate-50 rounded-[2rem] border border-slate-100';
                div.innerHTML = \`
                    <p class="text-[9px] font-black text-slate-400 uppercase mb-1">\${kpi.label}</p>
                    <p class="text-2xl font-black text-slate-900">\${display}</p>
                \`;
                container.appendChild(div);
            });
        }

        function renderTabCharts(rows) {
            // Lógica para detectar sub-dimensiones (Clasificación, Concepto)
            const keys = Object.keys(rows[0]);
            const subDim = keys.find(k => k.toLowerCase().includes('clasific')) || keys.find(k => k.toLowerCase().includes('tipo')) || keys[1];
            
            const grouped = {};
            rows.forEach(r => {
                const k = r[subDim] || "N/A";
                grouped[k] = (grouped[k] || 0) + (Number(r[mapping.metric1]) || 0);
            });

            const labels = Object.keys(grouped).sort((a,b) => grouped[b] - grouped[a]).slice(0, 10);
            const values = labels.map(l => grouped[l]);

            if (charts.tab1) charts.tab1.destroy();
            charts.tab1 = new Chart(document.getElementById('tabChart1'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{ label: mapping.metric1, data: values, backgroundColor: '#006341', borderRadius: 8 }]
                },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        function renderTable(rows) {
            const header = document.getElementById('table-header');
            const body = document.getElementById('table-body');
            header.innerHTML = "";
            body.innerHTML = "";

            const keys = Object.keys(rows[0]).slice(0, 6);
            keys.forEach(k => {
                const th = document.createElement('th');
                th.className = "px-6 py-4";
                th.textContent = k;
                header.appendChild(th);
            });

            rows.forEach(r => {
                const tr = document.createElement('tr');
                keys.forEach(k => {
                    const td = document.createElement('td');
                    td.className = "px-6 py-4 text-xs font-medium text-slate-600";
                    const val = r[k];
                    td.textContent = typeof val === 'number' ? val.toLocaleString() : val;
                    tr.appendChild(td);
                });
                body.appendChild(tr);
            });
        }

        init();
    </script>
</body>
</html>`;
}
