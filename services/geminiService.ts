
import { GoogleGenAI, Type } from "@google/genai";
import { DataRow, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeDataWithAI(data: DataRow[]): Promise<AnalysisResult> {
  const sample = data.slice(0, 5);
  const keys = Object.keys(data[0] || {});

  const prompt = `Analiza estas columnas de datos: ${keys.join(", ")}
  Muestra de datos: ${JSON.stringify(sample)}
  
  Basado en esto, genera la configuración ideal para un tablero de control de gestión pública.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "Eres un experto analista de datos y diseñador de UI/UX para gobiernos. Tu tarea es analizar estructuras de datos y proponer la mejor forma de visualizarlos en un dashboard, devolviendo siempre un JSON válido que siga estrictamente el esquema proporcionado.",
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 2000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedMapping: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: "Columna para el eje X o categorías." },
              metric1: { type: Type.STRING, description: "Métrica numérica principal." },
              metric2: { type: Type.STRING, description: "Métrica numérica secundaria." },
              date: { type: Type.STRING },
              location: { type: Type.STRING }
            },
            required: ["category", "metric1", "metric2"],
            propertyOrdering: ["category", "metric1", "metric2", "date", "location"]
          },
          suggestedConfig: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              kpis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    key: { type: Type.STRING },
                    format: { type: Type.STRING, description: "Uno de: 'currency', 'percent', 'number'." }
                  },
                  required: ["label", "key", "format"]
                }
              },
              charts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "Uno de: 'bar', 'area', 'donut'." },
                    title: { type: Type.STRING },
                    dimension: { type: Type.STRING },
                    metric: { type: Type.STRING }
                  },
                  required: ["type", "title", "dimension", "metric"]
                }
              },
              colors: {
                type: Type.OBJECT,
                properties: {
                  primary: { type: Type.STRING },
                  secondary: { type: Type.STRING },
                  accent: { type: Type.STRING }
                },
                required: ["primary", "secondary", "accent"]
              }
            },
            required: ["title", "subtitle", "kpis", "charts", "colors"],
            propertyOrdering: ["title", "subtitle", "kpis", "charts", "colors"]
          },
          dataOverview: { type: Type.STRING, description: "Breve resumen de lo que representan los datos." }
        },
        required: ["suggestedMapping", "suggestedConfig", "dataOverview"],
        propertyOrdering: ["suggestedMapping", "suggestedConfig", "dataOverview"]
      }
    }
  });

  if (!response.text) {
    throw new Error("El modelo no devolvió contenido.");
  }

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Error parseando JSON de Gemini:", response.text);
    throw new Error("La respuesta del modelo no es un JSON válido.");
  }
}
