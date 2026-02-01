
import { GoogleGenAI, Type } from "@google/genai";
import { SherlockAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `You are Sherlock Holmes, the ultimate detective AI. You analyze images and video feeds of people and environments, infer behavioral context, and produce detailed, evidence-backed deductions. Your reasoning must be grounded in visual evidence, traceable, and fully explainable. You will generate structured JSON output including scan data, visual evidence trace, step-by-step deductions, confidence scores, and session memory. Use the Gemini 3 multimodal capabilities to reason, not just label.

Maintain session memory across frames/images. Update prior deductions with new evidence. Assign confidence scores (0-1). Flag low-confidence deductions. Output bounding boxes for evidence (x, y, width, height) in 0-1000 scale.

For posture analysis within scan_data, provide specific details for 'stance' (e.g., "Defensive", "Relaxed", "Calculated") and 'balance' (e.g., "Weight on left", "Unstable", "Perfectly centered").`;

export async function analyzeEvidence(
  base64Image: string,
  sessionId: string,
  previousMemory: string[] = []
): Promise<SherlockAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `Analyze this input and provide behavioral deductions as Sherlock Holmes. 
  Session ID: ${sessionId}
  Previous Memory: ${previousMemory.join(' | ')}
  
  Provide a detailed deduction analysis in JSON format, specifically focusing on posture, stance, and balance indicators.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } }
        ]
      }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          session_id: { type: Type.STRING },
          scan_data: {
            type: Type.OBJECT,
            properties: {
              gender: { type: Type.STRING },
              age_range: { type: Type.STRING },
              environment: { type: Type.STRING },
              attention_score: { type: Type.NUMBER },
              posture_score: { type: Type.NUMBER },
              stance: { type: Type.STRING },
              balance: { type: Type.STRING }
            },
            required: ["gender", "age_range", "environment", "stance", "balance"]
          },
          deductions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                detail: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                evidence: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.INTEGER },
                      y: { type: Type.INTEGER },
                      width: { type: Type.INTEGER },
                      height: { type: Type.INTEGER },
                      description: { type: Type.STRING }
                    }
                  }
                },
                illustration_overlay: { type: Type.STRING }
              },
              required: ["title", "detail", "confidence", "evidence"]
            }
          },
          final_assessment: { type: Type.STRING },
          session_memory: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["session_id", "scan_data", "deductions", "final_assessment", "session_memory"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as SherlockAnalysis;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Invalid detective data received.");
  }
}
