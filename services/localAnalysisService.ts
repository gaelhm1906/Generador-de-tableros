
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
  const tableNames = Object.keys(store);
  if (tableNames.length === 0) throw new Error("No hay tablas cargadas.");

  // Identificar la tabla principal (la que tenga más datos o sea más rica en métricas)
  const mainTableName = tableNames.reduce((a, b) => 
    store[a].rows.length > store[b].rows.length ? a : b
  );
  
  const mainTable = store[mainTableName];
  const colNames = Object.keys(mainTable.columns);

  // Clasificación de familia basada en la tabla principal
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
  
  if (scores.OPERATIVO === maxScore && maxScore > 25) family = 'GENERICO';
  else if (scores.OBRA_PUBLICA === maxScore) family = 'OBRA_PUBLICA';
  else if (scores.FINANCIERO === maxScore) family = 'FINANCIERO';
  else if (scores.PROGRAMA_SOCIAL === maxScore) family = 'PROGRAMA_SOCIAL';

  const findCol = (tblName: string, tags: string[]) => 
    Object.keys(store[tblName].columns).find(c => tags.some(t => c.toLowerCase().includes(t)));

  const sections: DashboardSection[] = [];
  const kpis: any[] = [];

  // Intentar distribuir KPIs entre las tablas disponibles
  tableNames.forEach((tblName, idx) => {
    const tblCols = Object.keys(store[tblName].columns);
    const m1 = findCol(tblName, ['monto', 'presupuesto', 'total', 'importe']) || tblCols.find(c => store[tblName].columns[c].isMetric);
    const dim = findCol(tblName, ['nombre', 'unidad', 'alcaldia', 'categoria']) || tblCols.find(c => store[tblName].columns[c].isDimension) || tblCols[0];

    if (idx < 4 && m1) {
      kpis.push({
        label: `${tblName.split('.')[0]}: Total`,
        tableName: tblName,
        key: m1,
        format: 'currency'
      });
    }

    // Crear una sección por cada tabla importante
    if (idx < 3) {
      const metric = m1 || tblCols[0];
      const dimension = dim;
      
      sections.push({
        title: `Análisis de ${tblName.split('.')[0]}`,
        description: `Visualización de datos fuente: ${tblName}`,
        charts: [
          { 
            id: `c-${idx}-1`, 
            type: 'bar', 
            tableName: tblName,
            title: `Distribución por ${dimension}`, 
            dimension, 
            metric, 
            color: idx % 2 === 0 ? THEME_CONST.GUINDA : THEME_CONST.VERDE 
          },
          { 
            id: `c-${idx}-2`, 
            type: 'pie', 
            tableName: tblName,
            title: `Participación de ${metric}`, 
            dimension, 
            metric, 
            color: idx % 2 === 0 ? THEME_CONST.DORADO : THEME_CONST.GUINDA 
          }
        ]
      });
    }
  });

  return {
    suggestedMapping: { category: '', metric1: '', metric2: '' },
    suggestedConfig: {
      family,
      title: "Consolidado de Datos SOBSE",
      subtitle: "Panel unificado basado en múltiples fuentes de información de auditoría.",
      sections,
      kpis: kpis.length > 0 ? kpis : [{ label: "Registros", tableName: mainTableName, key: colNames[0], format: 'number' }],
      // Fix: Added missing required property 'headerBgColor'
      headerBgColor: '#0F172A',
      colors: { primary: THEME_CONST.GUINDA, secondary: THEME_CONST.VERDE, accent: THEME_CONST.DORADO }
    },
    aiInsights: [
      `Tablas procesadas: ${tableNames.length}`,
      `Se han integrado métricas de diferentes archivos.`
    ],
    confidenceScore: maxScore
  };
}