
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
  type: 'bar' | 'area' | 'line' | 'pie' | 'radar' | 'webview' | 'timeline' | 'combo' | 'tour360';
  tableName: string;
  title: string;
  description?: string;
  dimension: string;
  metric: string;
  metricLine?: string; // Para tipo combo: segunda métrica (línea)
  color: string;
  color2?: string;      // Para tipo combo
  url?: string;
  previewUrl?: string; // Para tour360
  startDateCol?: string;
  endDateCol?: string;
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
  kpis: { 
    label: string; 
    tableName: string; 
    key: string; 
    format: 'currency' | 'percent' | 'number' | 'mdp';
    statusLabel?: string;
    // statusColor allows tracking status indicators with specific colors in the dashboard
    statusColor?: string;
    footerText?: string;
  }[];
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
