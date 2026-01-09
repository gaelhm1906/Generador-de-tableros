
import { 
  DataRow, TableStore, AnalysisResult, DashboardConfig, 
  ColumnMetadata, DashboardFamily, DashboardSection, KPIConfig, ChartConfig 
} from "../types";
import { SOBSE_THEME as THEME_CONST } from "../constants";

const SEMANTIC_SIGNALS = {
  OBRA: ['obra', 'contrato', 'utopia', 'avance', 'fisico', 'licitacion', 'ubicacion', 'alcaldia', 'empresa', 'proyecto'],
  FINANCIERO: ['monto', 'presupuesto', 'ejercido', 'pagado', 'economico', 'costo', 'inversion', 'capitulo', 'partida', 'importe', 'financiero'],
  PROGRAMA: ['meta', 'beneficiario', 'poblacion', 'cobertura', 'apoyo', 'entregado', 'solicitud', 'cancha', 'punto'],
  DESCRIPTIVO: ['problemática', 'comentario', 'observación', 'descripción', 'estatus', 'detalle', 'nota', 'seguimiento', 'nombre', 'obra']
};

export function analyzeMultiTableData(store: TableStore): AnalysisResult {
  const tableNames = Object.keys(store);
  if (tableNames.length === 0) throw new Error("No hay tablas cargadas.");

  const mainTableName = tableNames[0];
  const table = store[mainTableName];
  const columns = table.columns;
  const colNames = Object.keys(columns);

  // Clasificación de Familia
  const scores = { OBRA: 0, FINANCIERO: 0, PROGRAMA: 0 };
  colNames.forEach(name => {
    const l = name.toLowerCase();
    if (SEMANTIC_SIGNALS.OBRA.some(s => l.includes(s))) scores.OBRA += 1;
    if (SEMANTIC_SIGNALS.FINANCIERO.some(s => l.includes(s))) scores.FINANCIERO += 1;
    if (SEMANTIC_SIGNALS.PROGRAMA.some(s => l.includes(s))) scores.PROGRAMA += 1;
  });

  let family: DashboardFamily = 'GENERICO';
  if (scores.OBRA >= scores.FINANCIERO && scores.OBRA >= scores.PROGRAMA) family = 'OBRA_PUBLICA';
  else if (scores.FINANCIERO > scores.OBRA) family = 'FINANCIERO';

  // Estrategia de KPIs (Top 4 Métricas)
  const kpis: KPIConfig[] = [];
  const metrics = colNames.filter(c => columns[c].isMetric);
  const dimensions = colNames.filter(c => columns[c].isDimension);

  metrics.slice(0, 4).forEach((m, idx) => {
    const l = m.toLowerCase();
    const format: any = l.includes('monto') || l.includes('inversión') || l.includes('ejercido') ? 'currency' : 
                   l.includes('avance') || l.includes('porcentaje') ? 'percent' : 'number';
    kpis.push({
      label: m.toUpperCase(),
      tableName: mainTableName,
      key: m,
      format,
      width: '1/4',
      statusColor: idx % 3 === 0 ? THEME_CONST.GUINDA : (idx % 3 === 1 ? THEME_CONST.VERDE : THEME_CONST.DORADO)
    });
  });

  if (kpis.length < 2) {
      kpis.push({ label: "REGISTROS TOTALES", tableName: mainTableName, key: colNames[0], format: 'number', width: '1/4', statusColor: THEME_CONST.GUINDA });
  }

  // Generación de Secciones Temáticas
  const sections: DashboardSection[] = [];
  
  // 1. PANORAMA ESTRATÉGICO
  if (dimensions.length > 0 && metrics.length > 0) {
    sections.push({
      title: "PANORAMA ESTRATÉGICO",
      description: "Distribución de los indicadores principales por categorías clave detectadas en el dataset.",
      charts: [
        {
          id: 'auto-1', type: 'bar', tableName: mainTableName,
          title: `Distribución por ${dimensions[0]}`,
          dimension: dimensions[0], metric: metrics[0], color: THEME_CONST.GUINDA
        },
        {
          id: 'auto-2', type: 'pie', tableName: mainTableName,
          title: `Composición de ${metrics[0]}`,
          dimension: dimensions[0], metric: metrics[0], color: THEME_CONST.VERDE
        }
      ]
    });
  }

  // 2. SEGUIMIENTO TEMPORAL (Heurística de fechas)
  const dateCols = colNames.filter(c => columns[c].type === 'date' || c.toLowerCase().includes('mes') || c.toLowerCase().includes('año'));
  if (dateCols.length > 0 && metrics.length > 0) {
      sections.push({
          title: "EVOLUCIÓN Y TIEMPOS",
          description: "Análisis del avance físico y financiero a través del tiempo para detectar tendencias.",
          charts: [
              {
                  id: 'auto-temp-1', type: 'timeline', tableName: mainTableName,
                  title: "Línea de Tiempo de Ejecución",
                  dimension: dateCols[0], metric: metrics[0], color: THEME_CONST.DORADO
              }
          ]
      });
  }

  // 3. DETALLE DE OBRA / PROYECTO
  const importantCols = colNames.filter(c => SEMANTIC_SIGNALS.DESCRIPTIVO.some(s => c.toLowerCase().includes(s)));
  if (importantCols.length > 0) {
      sections.push({
          title: "EXPEDIENTE TÉCNICO",
          description: "Resumen detallado de las características técnicas y administrativas del proyecto.",
          charts: [
              {
                  id: 'auto-tech-1', type: 'technicalFile', tableName: mainTableName,
                  title: "Ficha de Control Maestro",
                  dimension: importantCols[0], metric: metrics[0] || colNames[0], color: THEME_CONST.GUINDA
              }
          ]
      });
  }

  // 4. BITÁCORA DE DATOS
  sections.push({
    title: "REGISTRO DETALLADO",
    description: "Consulta exhaustiva de todos los movimientos, observaciones y registros cargados.",
    charts: [
      {
        id: 'auto-table-1', type: 'table', tableName: mainTableName,
        title: "Bitácora de Operaciones",
        dimension: colNames[0], metric: metrics[0] || colNames[0], color: THEME_CONST.VERDE
      }
    ]
  });

  return {
    suggestedMapping: { category: dimensions[0] || '', metric1: metrics[0] || '', metric2: metrics[1] || '' },
    suggestedConfig: {
      family,
      title: "TABLERO INTEGRAL SOBSE",
      subtitle: `Análisis automatizado de la fuente "${mainTableName}". Visualización de alto nivel para gestión pública.`,
      topPillText: "CEREBRO LOCAL SINCRONIZADO",
      headerBgColor: '#0F172A',
      colors: { primary: THEME_CONST.GUINDA, secondary: THEME_CONST.VERDE, accent: THEME_CONST.DORADO },
      sections,
      kpis
    },
    aiInsights: ["Análisis multivariable completado.", "Secciones temáticas generadas por relevancia semántica.", "Detección de montos y avances activada."],
    confidenceScore: 90
  };
}
