import { GoogleGenAI, Type } from "@google/genai";

// Deprecated: Gemini moved to server-side for security & env support
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  post: string;
  riskLevel: "Low" | "Medium" | "High";
  riskScore: number;
  reason: string;
  suggestedAction: "Delete" | "Archive" | "Safe";
}

// analyzePost func deprecated - moved to server.ts
// Full func commented out for type reference only
/*
export async function analyzePost(post: string): Promise<AnalysisResult> {
  ... full body above
}
*/
