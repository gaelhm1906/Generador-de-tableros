
import { GoogleGenAI, Type } from "@google/genai";
import { DataRow, AnalysisResult, DashboardConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeDataWithAI(data: DataRow[], history: DashboardConfig[] = []): Promise<AnalysisResult> {
  const sample = data.slice(0, 15);
  const keys = Object.keys(data[0] || {});

  const historyContext = history.length > 0 
    ? `HISTORIAL DE APRENDIZAJE:\n${JSON.stringify(history.map(h => ({ title: h.title, sections: h.sections.length })))}`
    : "No hay ejemplos previos.";

  const prompt = `Actúa como un Arquitecto de Datos Senior de SOBSE.
  
  CONTEXTO DE APRENDIZAJE:
  ${historyContext}
  
  DATASET ACTUAL:
  Columnas exactas: ${keys.join(", ")}
  Muestra de datos: ${JSON.stringify(sample)}
  
  REGLAS DE VISUALIZACIÓN INTELIGENTE:
  1. Si una columna contiene textos largos, problemáticas, observaciones o descripciones (ej. "Problemática", "Comentario"), NO uses 'bar'. Usa 'table' o 'technicalFile'.
  2. Si una columna indica fechas o cronogramas (ej. "Calendario", "Semana", "Inicio"), usa 'table'.
  3. Usa 'bar' o 'pie' solo para métricas numéricas comparativas claras (ej. Avance, Monto).
  4. Si hay URLs, usa 'webview' o 'tour360'.
  
  INSTRUCCIONES TÉCNICAS:
  - Genera un DashboardConfig completo en JSON.
  - Colores: Guinda #691C32, Verde #006341, Dorado #C5A572.
  - Sé extremadamente preciso con los nombres de las columnas.
  
  RESPONDE ÚNICAMENTE CON EL JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "Eres el Cerebro de Datos de SOBSE. Tu prioridad es la legibilidad. Si los datos son descriptivos, prefieres tablas o fichas antes que gráficas.",
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 4000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedMapping: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              metric1: { type: Type.STRING },
              metric2: { type: Type.STRING }
            },
            required: ["category", "metric1", "metric2"]
          },
          suggestedConfig: {
            type: Type.OBJECT,
            properties: {
              family: { type: Type.STRING },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              headerBgColor: { type: Type.STRING },
              colors: {
                type: Type.OBJECT,
                properties: {
                  primary: { type: Type.STRING },
                  secondary: { type: Type.STRING },
                  accent: { type: Type.STRING }
                },
                required: ["primary", "secondary", "accent"]
              },
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
                          color: { type: Type.STRING },
                          url: { type: Type.STRING }
                        },
                        required: ["type", "title", "dimension", "metric", "color", "tableName"]
                      }
                    }
                  },
                  required: ["title", "description", "charts"]
                }
              },
              kpis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    tableName: { type: Type.STRING },
                    key: { type: Type.STRING },
                    format: { type: Type.STRING },
                    statusLabel: { type: Type.STRING },
                    statusColor: { type: Type.STRING },
                    width: { type: Type.STRING }
                  },
                  required: ["label", "key", "format", "tableName"]
                }
              }
            },
            required: ["title", "subtitle", "sections", "kpis", "family", "headerBgColor", "colors"]
          },
          aiInsights: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["suggestedMapping", "suggestedConfig", "aiInsights"]
      }
    }
  });

  if (!response.text) throw new Error("Fallo en el análisis del Cerebro.");
  return JSON.parse(response.text.trim());
}
