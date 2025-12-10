import { GoogleGenAI, Type } from "@google/genai";
import { DatabaseSchema } from "../types";

export const generateSchemaFromPrompt = async (prompt: string): Promise<DatabaseSchema> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Design a database schema based on this description: "${prompt}". 
    If the user doesn't specify types, infer appropriate SQL types (UUID, INT, VARCHAR, TIMESTAMP, etc.).
    Ensure to identify primary keys and foreign keys.
    Infer relationships based on standard conventions (e.g., user_id in posts table implies a relationship).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tables: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                columns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      type: { type: Type.STRING },
                      isPrimaryKey: { type: Type.BOOLEAN },
                      isForeignKey: { type: Type.BOOLEAN },
                      references: { type: Type.STRING, description: "Format: TargetTable.TargetColumn if FK" },
                      nullable: { type: Type.BOOLEAN }
                    },
                    required: ["name", "type"]
                  }
                }
              },
              required: ["name", "columns"]
            }
          },
          relationships: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fromTable: { type: Type.STRING },
                fromColumn: { type: Type.STRING },
                toTable: { type: Type.STRING },
                toColumn: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["1:1", "1:N", "N:M"] }
              },
              required: ["fromTable", "fromColumn", "toTable", "toColumn", "type"]
            }
          }
        },
        required: ["tables", "relationships"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  try {
    return JSON.parse(text) as DatabaseSchema;
  } catch (e) {
    console.error("Failed to parse JSON", e);
    throw new Error("Failed to parse AI response");
  }
};