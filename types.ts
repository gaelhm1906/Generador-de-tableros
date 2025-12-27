
export interface DataRow {
  [key: string]: any;
}

export type DashboardFamily = 'OBRA_PUBLICA' | 'FINANCIERO' | 'PROGRAMA_SOCIAL' | 'GENERICO';

export interface ColumnMetadata {
  name: string;
  alias?: string;
  type: 'number' | 'text' | 'date';
  uniqueRatio: number;
  isMetric: boolean;
  isDimension: boolean;
  scoreTags: string[];
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
  type: 'bar' | 'area' | 'line' | 'pie' | 'radar' | 'webview' | 'timeline' | 'combo' | 'tour360' | 'multiBar';
  tableName: string;
  title: string;
  description?: string;
  dimension: string;
  metric: string; // Métrica principal
  metrics?: string[]; // Para múltiples series (Barras agrupadas o líneas múltiples)
  tooltipMetrics?: string[]; 
  color: string;
  color2?: string;
  url?: string;
  previewUrl?: string;
  startDateCol?: string; // Para Timeline
  endDateCol?: string;   // Para Timeline
}

export interface DashboardSection {
  title: string;
  description: string;
  charts: ChartConfig[];
}

export interface KPIConfig {
  label: string; 
  tableName: string; 
  key: string; 
  format: 'currency' | 'percent' | 'number' | 'mdp';
  statusLabel?: string;
  statusColor?: string;
  footerText?: string;
  width?: '1/4' | '1/2' | 'full'; // Control de tamaño de la card
}

export interface DashboardConfig {
  family: DashboardFamily;
  title: string;
  subtitle: string;
  topPillText?: string;
  sections: DashboardSection[];
  kpis: KPIConfig[];
  headerBgColor: string;
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
