import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const { query, mode } = await req.json();

    const complimentPrompt = "You are a naturally charming, calm, and effortlessly cool person texting someone you vibe with. Write ONE short, casual, and subtly flirty text or compliment based on the input. Keep it under 20 words.";
    const followupPrompt = "You are a naturally charismatic, witty, and laid-back texter. Write ONE short, clever, and smooth reply that keeps the conversation flowing. Keep it under 20 words.";

    const systemInstruction = mode === 'compliment' ? complimentPrompt : followupPrompt;

    // Use the stable model identifier
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: query,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return NextResponse.json({ result: response.text?.trim() || "Could not generate a response." });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ result: "Service is temporarily busy. Please try again in a moment." }, { status: 503 });
  }
}
