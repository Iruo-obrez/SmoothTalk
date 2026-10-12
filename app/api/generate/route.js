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
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!openrouterKey) {
      return NextResponse.json({ result: "Error: OPENROUTER_API_KEY is missing from Vercel environment variables." });
    }

    // Single provider call to OpenRouter's free tier router
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://smoothtalk-phi.vercel.app',
        'X-Title': 'SmoothTalk',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data?.error?.message || `HTTP error ${response.status}`;
      return NextResponse.json({ result: `OpenRouter Error: ${errorMsg}` });
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ result: "Error: OpenRouter returned an empty response." });
    }

    return NextResponse.json({ result: text.trim() });

  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json({ result: `Server Error: ${error.message}` });
  }
}
