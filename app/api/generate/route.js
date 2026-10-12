import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { query, mode } = await req.json();

    const complimentPrompt = "You are a naturally charming, calm, and effortlessly cool person texting someone you vibe with. The user will give you a trait or topic (e.g., 'blue eyes' or 'reading'). Write ONE short, casual, and subtly flirty text or compliment based on it. Sound like a real human texting naturally on an iPhone—no cheesy pick-up lines, no overly poetic AI fluff, no exclamation marks unless necessary, and zero cringe. Keep it under 20 words.";
    
    const followupPrompt = "You are a naturally charismatic, witty, and laid-back texter. The user will give you the last message they received. Write ONE short, clever, and smooth reply that keeps the conversation flowing without trying too hard. Sound completely human, relaxed, and cool. No robotic or formal AI tone. Keep it under 20 words.";

    const systemPrompt = mode === 'compliment' ? complimentPrompt : followupPrompt;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ result: "API key missing on server." }, { status: 500 });
    }

    const payload = {
      contents: [{ parts: [{ text: query }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    // Auto-retry up to 3 times if Google experiences temporary high demand
    const MAX_RETRIES = 3;
    let data;

    for (let i = 0; i < MAX_RETRIES; i++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      data = await response.json();

      // If successful, break the retry loop
      if (response.ok && !data.error) {
        break;
      }

      // If high demand/rate limit error, wait briefly before retrying
      if (i < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
      }
    }

    if (data?.error) {
      console.error("Gemini API Error Detail:", data.error);
      return NextResponse.json({ result: "The server is a bit busy right now. Give it another tap in a sec!" });
    }

    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (resultText) {
      return NextResponse.json({ result: resultText.trim() });
    } else {
      return NextResponse.json({ result: "Could not generate a response. Please try again." });
    }
  } catch (error) {
    console.error("Route Handler Error:", error);
    return NextResponse.json({ result: "Server error handling request." }, { status: 500 });
  }
}
