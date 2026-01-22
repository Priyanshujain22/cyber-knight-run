
import { GoogleGenAI, Type } from "@google/genai";
import { DailyChallenge, GameSettings } from "../types";

export const fetchDailyChallenge = async (): Promise<DailyChallenge> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a daily challenge for a cyberpunk medieval runner game named 'Cyber Knight Run'. Give it a title, a short epic description, and a bonus multiplier (1.1 to 2.0).",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            bonusMultiplier: { type: Type.NUMBER }
          },
          required: ["title", "description", "bonusMultiplier"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Fetch Error:", error);
    return {
      title: "Neon Chivalry",
      description: "Dodge the digital shadows and reclaim the core.",
      bonusMultiplier: 1.2
    };
  }
};

export const fetchDeathMessage = async (score: number): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The player just died in 'Cyber Knight Run' with a score of ${score}. Provide a short, witty, 1-sentence sarcastic remark from a cybernetic overlord.`,
    });
    return response.text || "Your armor was not enough, knight.";
  } catch {
    return "The system reclaimed your data.";
  }
};

export const adjustDifficulty = (score: number): GameSettings => {
  // Simple heuristic but influenced by AI logic patterns
  const scale = 1 + Math.floor(score / 2000) * 0.15;
  return {
    baseSpeed: Math.min(8 * scale, 25),
    spawnRate: Math.max(0.6 / scale, 0.2),
    difficultyScale: scale
  };
};
