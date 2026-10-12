import { NextResponse } from 'next/server';

// Helper function to handle automatic retries with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If server returns a 5xx error or rate limit, throw to trigger retry
      if (response.status === 503 || response.status === 429) {
        if (attempt === maxRetries) return response;
        throw new Error(`Temporary server load (Status: ${response.status})`);
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Double the wait time for each subsequent retry (1s, 2s, 4s)
    }
  }
}

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

    // Make the fetch request through our automatic retry wrapper
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API Error Detail:", data.error);
      return NextResponse.json({ result: `Error: ${data.error.message}` });
    }

    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (resultText) {
      return NextResponse.json({ result: resultText.trim() });
    } else {
      return NextResponse.json({ result: "Could not generate a response. Please try again." });
    }
  } catch (error) {
    console.error("Route Handler Error:", error);
    return NextResponse.json({ result: "Service is temporarily busy. Please try again in a moment." }, { status: 503 });
  }
}
