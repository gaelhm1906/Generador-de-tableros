
export interface DataRow {
  [key: string]: any;
}

export interface ColumnMapping {
  category: string;
  metric1: string;
  metric2: string;
  date?: string;
  location?: string;
}

export interface DashboardConfig {
  title: string;
  subtitle: string;
  kpis: { label: string; key: string; format: 'currency' | 'percent' | 'number' }[];
  charts: {
    type: 'bar' | 'area' | 'donut';
    title: string;
    dimension: string;
    metric: string;
  }[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface AnalysisResult {
  suggestedMapping: ColumnMapping;
  suggestedConfig: DashboardConfig;
  dataOverview: string;
}
