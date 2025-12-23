
export interface DataRow {
  [key: string]: any;
}

export interface ColumnMapping {
  category: string; // Eje X / Agrupador principal
  metric1: string;  // Métrica principal (Ej: Monto)
  metric2: string;  // Métrica secundaria (Ej: Avance)
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
}
