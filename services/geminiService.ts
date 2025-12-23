
import { GoogleGenAI, Type } from "@google/genai";
import { DataRow, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeDataWithAI(data: DataRow[]): Promise<AnalysisResult> {
  const sample = data.slice(0, 15);
  const keys = Object.keys(data[0] || {});

  const prompt = `Actúa como un Arquitecto de Soluciones de Inteligencia de Negocios.
  He recibido un dataset de la Secretaría de Obras con estas columnas: ${keys.join(", ")}
  Muestra representativa: ${JSON.stringify(sample)}
  
  TU OBJETIVO:
  1. Identificar la temática principal (Infraestructura, Finanzas, Recursos Humanos, etc.).
  2. Identificar columnas que sirven como 'Dimensiones' (Alcaldías, Tipos, Estatus, Nombres) y 'Métricas' (Montos, Cantidades, Porcentajes).
  3. Proponer un Dashboard Ejecutivo que cuente una historia coherente.
  
  INSTRUCCIONES DE ESTRUCTURA:
  - 'suggestedMapping': Selecciona la mejor columna para agrupar (category) y las dos métricas numéricas más importantes.
  - 'suggestedConfig': Define el título, subtítulo y al menos 3 secciones.
  - Cada sección debe tener 2 gráficos con el tipo (bar, pie, area, radar) que mejor represente ese dato.
  - Elige colores institucionales (usa códigos hexadecimales similares a Guinda #691C32, Verde #006341, Dorado #C5A572).
  - Sugiere 4 KPIs de alto nivel.
  
  IMPORTANTE: Solo responde con el objeto JSON solicitado. No incluyas explicaciones adicionales.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "Eres un sistema experto en análisis de datos para el Gobierno de la CDMX. Tu salida siempre es JSON puro.",
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
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
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
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          dimension: { type: Type.STRING },
                          metric: { type: Type.STRING },
                          color: { type: Type.STRING }
                        },
                        required: ["type", "title", "dimension", "metric", "color"]
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
                    key: { type: Type.STRING },
                    format: { type: Type.STRING }
                  },
                  required: ["label", "key", "format"]
                }
              }
            },
            required: ["title", "subtitle", "sections", "kpis"]
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

  if (!response.text) throw new Error("Fallo en el análisis inteligente.");
  return JSON.parse(response.text.trim());
}
