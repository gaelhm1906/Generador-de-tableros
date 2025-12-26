
import { 
  DataRow, TableStore, AnalysisResult, DashboardConfig, 
  ColumnMetadata, DashboardFamily, DashboardSection 
} from "../types";
import { SOBSE_THEME as THEME_CONST } from "../constants";

const SEMANTIC_SIGNALS = {
  OBRA: ['obra', 'contrato', 'utopia', 'avance', 'fisico', 'licitacion', 'ubicacion', 'alcaldia', 'empresa'],
  FINANCIERO: ['monto', 'presupuesto', 'ejercido', 'pagado', 'economico', 'costo', 'inversion', 'capitulo', 'partida', 'importe'],
  PROGRAMA: ['meta', 'beneficiario', 'poblacion', 'cobertura', 'apoyo', 'entregado', 'solicitud', 'cancha', 'punto'],
  OPERATIVO: ['cuadrilla', 'personal', 'base', 'cuadrilla', 'unidad', 'cantidad', 'concepto', 'clasificacion']
};

export function analyzeMultiTableData(store: TableStore): AnalysisResult {
  const mainTableName = Object.keys(store).reduce((a, b) => 
    store[a].rows.length > store[b].rows.length ? a : b
  );
  const mainTable = store[mainTableName];
  const columns = mainTable.columns;
  const colNames = Object.keys(columns);

  const scores = { OBRA_PUBLICA: 0, FINANCIERO: 0, PROGRAMA_SOCIAL: 0, OPERATIVO: 0 };
  
  colNames.forEach(name => {
    const lower = name.toLowerCase();
    if (SEMANTIC_SIGNALS.OBRA.some(s => lower.includes(s))) scores.OBRA_PUBLICA += 15;
    if (SEMANTIC_SIGNALS.FINANCIERO.some(s => lower.includes(s))) scores.FINANCIERO += 15;
    if (SEMANTIC_SIGNALS.PROGRAMA.some(s => lower.includes(s))) scores.PROGRAMA_SOCIAL += 15;
    if (SEMANTIC_SIGNALS.OPERATIVO.some(s => lower.includes(s))) scores.OPERATIVO += 20;
  });

  let family: DashboardFamily = 'GENERICO';
  const maxScore = Math.max(scores.OBRA_PUBLICA, scores.FINANCIERO, scores.PROGRAMA_SOCIAL, scores.OPERATIVO);
  
  if (scores.OPERATIVO === maxScore && maxScore > 25) family = 'GENERICO'; // Usamos genérico pero con perfil operativo
  else if (scores.OBRA_PUBLICA === maxScore) family = 'OBRA_PUBLICA';
  else if (scores.FINANCIERO === maxScore) family = 'FINANCIERO';
  else if (scores.PROGRAMA_SOCIAL === maxScore) family = 'PROGRAMA_SOCIAL';

  const findCol = (tags: string[]) => colNames.find(c => tags.some(t => c.toLowerCase().includes(t)));
  
  // Priorizar dimensiones operativas
  const dim = findCol(['cuadrilla', 'utopia', 'alcaldia', 'estatus']) || colNames.find(c => columns[c].isDimension) || colNames[0];
  const met1 = findCol(['importe', 'monto', 'presupuesto', 'total']) || colNames.find(c => columns[c].type === 'number') || colNames[1];
  const met2 = findCol(['cantidad', 'avance', 'fisico', '%', 'ejercido']) || met1;

  const sections: DashboardSection[] = [];
  const kpis: any[] = [];

  // Perfil DETALLADO (estilo el ejemplo del usuario)
  if (scores.OPERATIVO > 30 || family === 'OBRA_PUBLICA') {
    kpis.push(
      { label: "Total Unidades/Obras", key: dim, format: 'number' },
      { label: "Inversión/Costo Total", key: met1, format: 'currency' },
      { label: "Personal/Avance", key: met2, format: 'number' }
    );

    sections.push({
      title: "Análisis Ejecutivo Global",
      description: "Distribución de recursos y costos por agrupador principal",
      charts: [
        { id: 'g1', type: 'bar', title: `Costo Total por ${dim}`, dimension: dim, metric: met1, color: THEME_CONST.GUINDA },
        { id: 'g2', type: 'pie', title: `Distribución de ${met2}`, dimension: dim, metric: met2, color: THEME_CONST.VERDE }
      ]
    });

    // Detectar si hay clasificaciones para un desglose
    const subDim = findCol(['clasificacion', 'tipo', 'concepto']);
    if (subDim) {
      sections.push({
        title: "Desglose Operativo por Categoría",
        description: `Análisis detallado de conceptos y clasificaciones en ${dim}`,
        charts: [
          { id: 'd1', type: 'bar', title: `Top 10 Conceptos`, dimension: subDim, metric: met1, color: THEME_CONST.DORADO },
          { id: 'd2', type: 'pie', title: 'Participación de Clasificación', dimension: subDim, metric: met1, color: THEME_CONST.GUINDA }
        ]
      });
    }
  } else {
    // Perfil Estándar para otros casos
    kpis.push(
      { label: "Registros Totales", key: colNames[0], format: 'number' },
      { label: "Valor Acumulado", key: met1, format: 'currency' }
    );
    sections.push({
      title: "Resumen de Gestión",
      description: "Vista simplificada de indicadores clave",
      charts: [
        { id: 's1', type: 'bar', title: 'Rendimiento por Categoría', dimension: dim, metric: met1, color: THEME_CONST.VERDE },
        { id: 's2', type: 'area', title: 'Tendencia de Valores', dimension: dim, metric: met1, color: THEME_CONST.DORADO }
      ]
    });
  }

  return {
    suggestedMapping: { category: dim, metric1: met1, metric2: met2 },
    suggestedConfig: {
      family,
      title: family === 'OBRA_PUBLICA' ? "Tablero de Control de Infraestructura" : `Tablero Ejecutivo: ${dim}`,
      subtitle: "Análisis semántico avanzado - Secretaría de Obras y Servicios CDMX",
      sections,
      kpis,
      colors: { primary: THEME_CONST.GUINDA, secondary: THEME_CONST.VERDE, accent: THEME_CONST.DORADO }
    },
    aiInsights: [
      `Familia detectada: ${family}`,
      `Dimensión clave: ${dim}`,
      `Lógica aplicada: Perfil de Explorador de Datos SOBSE`
    ],
    confidenceScore: maxScore
  };
}
