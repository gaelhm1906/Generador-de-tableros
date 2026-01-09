
import { GoogleGenAI, Type } from "@google/genai";
import { DataRow, AnalysisResult, DashboardConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeDataWithAI(data: DataRow[], tableName: string, history: DashboardConfig[] = []): Promise<AnalysisResult> {
  const sample = data.slice(0, 30);
  const keys = Object.keys(data[0] || {});

  const prompt = `Actúa como el Consultor Senior de Analítica para la SOBSE.
  
  DATASET: "${tableName}"
  COLUMNAS: ${keys.join(", ")}
  MUESTRA: ${JSON.stringify(sample)}
  
  OBJETIVO:
  Crea un tablero de control TÉCNICO-INSTITUCIONAL exhaustivo. Debe ser complejo pero digerible.
  
  HERRAMIENTAS OBLIGATORIAS SI LOS DATOS LO PERMITEN:
  1. SCATTER (Dispersión): Relaciona 'Inversión' o 'Monto' vs 'Avance' o 'Población'. Es vital para ver eficiencia.
  2. RADAR: Si hay múltiples métricas (D1, D2, D3 o Beneficio, Equidad, Eficiencia), úsala para comparar el desempeño multidimensional de un registro.
  3. TIMELINE: Imprescindible si hay fechas para ver la línea de avance físico-financiero.
  4. TECHNICALFILE: Para la ficha técnica detallada del registro principal.
  5. KPI CARDS: Al menos 4 indicadores masivos (Inversión Total, Población Beneficiada, Avance Promedio, etc.).
  
  NARRATIVA DEL TABLERO:
  - SECCIÓN 1: "INDICADORES DE ALTO NIVEL" (KPIs).
  - SECCIÓN 2: "ANÁLISIS DE EFICIENCIA Y DISPERSIÓN" (Scatter plot de Inversión vs Avance).
  - SECCIÓN 3: "ESTRUCTURA Y DESEMPEÑO" (Radar de dimensiones y Bar charts de categorías).
  - SECCIÓN 4: "SEGUIMIENTO OPERATIVO" (Tabla de datos y Ficha técnica detallada).
  
  ESTÉTICA:
  - Fondos oscuros elegantes (#0D1014).
  - Acentos en Guinda (#691C32), Verde (#006341) y Dorado (#C5A572).
  - Títulos descriptivos y profesionales.
  
  RESPONDE ÚNICAMENTE CON EL JSON SIGUIENDO EL SCHEMA.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "Eres el motor de inteligencia de SOBSE. Tu trabajo es maximizar la profundidad técnica de los tableros. Prefieres gráficos complejos como Scatter y Radar sobre barras simples cuando el dataset tiene múltiples variables numéricas.",
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 12000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedMapping: {
            type: Type.OBJECT,
            properties: { category: { type: Type.STRING }, metric1: { type: Type.STRING }, metric2: { type: Type.STRING } },
            required: ["category", "metric1", "metric2"]
          },
          suggestedConfig: {
            type: Type.OBJECT,
            properties: {
              family: { type: Type.STRING },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              topPillText: { type: Type.STRING },
              headerBgColor: { type: Type.STRING },
              colors: { type: Type.OBJECT, properties: { primary: { type: Type.STRING }, secondary: { type: Type.STRING }, accent: { type: Type.STRING } } },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    charts: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          type: { type: Type.STRING },
                          tableName: { type: Type.STRING },
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          dimension: { type: Type.STRING },
                          metric: { type: Type.STRING },
                          metric2: { type: Type.STRING },
                          metrics: { type: Type.ARRAY, items: { type: Type.STRING } },
                          color: { type: Type.STRING },
                          url: { type: Type.STRING }
                        },
                        required: ["type", "title", "dimension", "metric", "color", "tableName"]
                      }
                    }
                  }
                }
              },
              kpis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { label: { type: Type.STRING }, tableName: { type: Type.STRING }, key: { type: Type.STRING }, format: { type: Type.STRING }, statusColor: { type: Type.STRING }, width: { type: Type.STRING } }
                }
              }
            }
          },
          aiInsights: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  if (!response.text) throw new Error("La IA no devolvió una respuesta válida.");
  return JSON.parse(response.text.trim());
}
