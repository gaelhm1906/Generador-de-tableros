
export interface DataRow {
  [key: string]: any;
}

export type DashboardFamily = 'OBRA_PUBLICA' | 'FINANCIERO' | 'PROGRAMA_SOCIAL' | 'GENERICO';

export interface ColumnMetadata {
  name: string;
  type: 'number' | 'text' | 'date';
  uniqueRatio: number; // Cardinalidad
  isMetric: boolean;
  isDimension: boolean;
  scoreTags: string[]; // Etiquetas como 'avance', 'dinero', 'geografia'
}

export interface TableStore {
  [tableName: string]: {
    rows: DataRow[];
    columns: { [colName: string]: ColumnMetadata };
  };
}

export interface ColumnMapping {
  category: string; 
  metric1: string;  
  metric2: string;  
  date?: string;
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'area' | 'line' | 'pie' | 'radar';
  title: string;
  description?: string;
  dimension: string;
  metric: string;
  color: string;
}

export interface DashboardSection {
  title: string;
  description: string;
  charts: ChartConfig[];
}

export interface DashboardConfig {
  family: DashboardFamily;
  title: string;
  subtitle: string;
  sections: DashboardSection[];
  kpis: { label: string; key: string; format: 'currency' | 'percent' | 'number' }[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface AnalysisResult {
  suggestedMapping: ColumnMapping;
  suggestedConfig: DashboardConfig;
  aiInsights: string[];
  confidenceScore: number;
}
