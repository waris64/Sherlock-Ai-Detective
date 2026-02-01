
import { GoogleGenAI, Type } from "@google/genai";
import { SherlockAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `You are Sherlock Holmes, the ultimate detective AI. 
You don't just see; you observe. Your specialty is "The Science of Deduction."
When analyzing images, look for:
1. "The Obvious": Basic facts about identity and environment.
2. "The Minutiae": Micro-details (scuffs, wear patterns, fabric quality, phone screens).
3. "The Inference": What these details imply about occupation, status, or motives.

Use your Thinking Budget for a rigorous "Chain of Thought" reasoning process. 
Include bounding boxes (0-1000) for evidence. 
Use the googleSearch tool for factual grounding of products or locations.

Output format must be strictly JSON. No markdown preamble.`;

async function callGemini(
  modelName: 'gemini-3-pro-preview' | 'gemini-3-flash-preview',
  base64Image: string,
  prompt: string,
  apiKey: string
): Promise<SherlockAnalysis> {
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: modelName,
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
      // Flash has lower reasoning depth than Pro but is much faster and has higher quota
      thinkingConfig: { thinkingBudget: modelName === 'gemini-3-pro-preview' ? 1500 : 1000 },
      tools: [{ googleSearch: {} }],
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
      }
    }
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  let text = response.text || '{}';
  text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  
  let parsed = JSON.parse(text) as SherlockAnalysis;
  
  if (groundingChunks && parsed.deductions) {
    parsed.deductions = parsed.deductions.map(d => ({
      ...d,
      grounding: groundingChunks
        .filter(c => c.web)
        .map(c => ({ title: c.web.title, uri: c.web.uri }))
    }));
  }

  return parsed;
}

export async function analyzeEvidence(
  base64Image: string,
  sessionId: string,
  previousMemory: string[] = []
): Promise<SherlockAnalysis> {
  const apiKey = process.env.API_KEY || '';
  const prompt = `Perform a deep behavioral scan on this subject. 
  Current Session: ${sessionId}
  Context from previous observations: ${previousMemory.join(' | ')}
  
  Examine the minutiae. What do their clothes, posture, and accessories reveal?
  Break down your reasoning into logic_steps.`;

  try {
    // Attempt with Pro first for high-quality detective work
    return await callGemini('gemini-3-pro-preview', base64Image, prompt, apiKey);
  } catch (err: any) {
    // If quota is exhausted (429), fall back to Flash model immediately
    if (err.message?.includes('RESOURCE_EXHAUSTED') || err.status === 429 || (err.error && err.error.code === 429)) {
      console.warn("Sherlock: Pro model quota exhausted. Falling back to Flash engine for continuity.");
      try {
        return await callGemini('gemini-3-flash-preview', base64Image, prompt, apiKey);
      } catch (fallbackErr: any) {
        throw new Error("QUOTA_EXHAUSTED: Both reasoning engines are at capacity. Please try again later.");
      }
    }
    
    console.error("Gemini Analysis Error:", err);
    throw err;
  }
}
