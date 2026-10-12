import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, mode } = body;

    if (!query || query.trim() === "") {
      return NextResponse.json({ result: "Please enter some text first!" });
    }

    const complimentPrompt = "You are a naturally charming, calm, and effortlessly cool person texting someone you vibe with. Write ONE short, casual, and subtly flirty text or compliment based on the input. Keep it under 20 words.";
    const followupPrompt = "You are a naturally charismatic, witty, and laid-back texter. Write ONE short, clever, and smooth reply that keeps the conversation flowing. Keep it under 20 words.";

    const systemPrompt = mode === 'compliment' ? complimentPrompt : followupPrompt;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return NextResponse.json({ result: "Error: GEMINI_API_KEY is not configured on Vercel." });
    }

    // Direct REST request to Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: query }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data?.error?.message || `HTTP error ${response.status}`;
      return NextResponse.json({ result: `Gemini Error: ${errorMsg}` });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ result: "Error: Received an empty response from Gemini." });
    }

    return NextResponse.json({ result: text.trim() });

  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json({ result: `Server Error: ${error.message}` });
  }
}
