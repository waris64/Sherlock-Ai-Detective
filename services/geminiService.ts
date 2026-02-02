
import { GoogleGenAI, Type } from "@google/genai";
import { SherlockAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `You are Sherlock Holmes, the ultimate detective AI. 
You don't just see; you observe. Your specialty is "The Science of Deduction."

When analyzing images, you must follow this exact JSON structure:
{
  "session_id": "string",
  "scan_data": {
    "gender": "string",
    "age_range": "string",
    "environment": "string",
    "attention_score": number (0.0 to 1.0),
    "posture_score": number (0.0 to 1.0),
    "stance": "string",
    "balance": "string"
  },
  "deductions": [
    {
      "title": "string",
      "detail": "string",
      "confidence": number (0.0 to 1.0),
      "logic_steps": ["string"],
      "evidence": [{"x": number, "y": number, "width": number, "height": number, "description": "string"}]
    }
  ],
  "final_assessment": "string",
  "session_memory": ["string"]
}

Observations must focus on:
1. "The Obvious": Basic facts about identity and environment.
2. "The Minutiae": Micro-details (scuffs, wear patterns, fabric quality, phone screens).
3. "The Inference": What these details imply about occupation, status, or motives.

Use your Thinking Budget for a rigorous "Chain of Thought" reasoning process. 
Include bounding boxes (0-1000) for evidence parts.
Output ONLY the raw JSON. No markdown backticks.`;

const RESPONSE_SCHEMA = {
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
      }
    },
    deductions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          logic_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
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
          }
        }
      },
      final_assessment: { type: Type.STRING },
      session_memory: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["session_id", "scan_data", "deductions", "final_assessment"]
  }
};

async function callGemini(
  modelName: 'gemini-3-pro-preview' | 'gemini-3-flash-preview',
  base64Image: string,
  mimeType: string,
  prompt: string,
  apiKey: string
): Promise<SherlockAnalysis> {
  const ai = new GoogleGenAI({ apiKey });
  
  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
  };

  if (modelName === 'gemini-3-pro-preview') {
    config.thinkingConfig = { thinkingBudget: 4000 };
  } else {
    config.responseMimeType = "application/json";
    config.responseSchema = RESPONSE_SCHEMA;
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType: mimeType } }
        ]
      }
    ],
    config: config
  });

  let text = response.text || '{}';
  
  // Clean up potential markdown formatting from the response
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON response:", text);
    throw new Error("Deductive reasoning yielded incoherent structure.");
  }

  // --- NORMALIZATION & SAFETY ---
  // Ensure scan_data exists
  if (!parsed.scan_data) {
    parsed.scan_data = {
      gender: "Unknown",
      age_range: "Unknown",
      environment: "Unknown",
      attention_score: 0.5,
      posture_score: 0.5,
      stance: "Indeterminate",
      balance: "Steady"
    };
  }

  // Coerce scores to numbers (important for Pro model which might return strings)
  const scoreKeys = ['attention_score', 'posture_score'] as const;
  scoreKeys.forEach(key => {
    if (parsed.scan_data[key] !== undefined) {
      parsed.scan_data[key] = parseFloat(String(parsed.scan_data[key]));
      if (isNaN(parsed.scan_data[key])) parsed.scan_data[key] = 0.5;
    }
  });

  if (!parsed.deductions || !Array.isArray(parsed.deductions)) parsed.deductions = [];
  parsed.deductions.forEach((d: any) => {
    if (!d.evidence) d.evidence = [];
    if (!d.logic_steps) d.logic_steps = [];
  });

  return parsed as SherlockAnalysis;
}

export async function analyzeEvidence(
  base64Image: string,
  mimeType: string,
  sessionId: string,
  previousMemory: string[] = []
): Promise<SherlockAnalysis> {
  const apiKey = process.env.API_KEY || '';
  const validMimeType = (mimeType && mimeType.includes('/')) ? mimeType : 'image/jpeg';
  
  const prompt = `Perform a deep behavioral scan. Current Session: ${sessionId}. 
  Examine the subject's clothing, posture, and environmental interaction. 
  You MUST return the scan_data object with gender, age_range, environment, attention_score, posture_score, stance, and balance.`;

  try {
    return await callGemini('gemini-3-pro-preview', base64Image, validMimeType, prompt, apiKey);
  } catch (err: any) {
    const isQuotaError = err.message?.includes('RESOURCE_EXHAUSTED') || err.status === 429;
    const isArgError = err.message?.includes('INVALID_ARGUMENT') || err.status === 400;

    if (isQuotaError || isArgError) {
      return await callGemini('gemini-3-flash-preview', base64Image, validMimeType, prompt, apiKey);
    }
    throw err;
  }
}
