import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, mode } = body;

    if (!query || query.trim() === "") {
      return NextResponse.json({ result: "Please type something first!" });
    }

    const systemPrompt = mode === 'compliment' 
      ? "Write ONE short, casual, and subtly flirty text or compliment. Under 20 words." 
      : "Write ONE short, clever, and smooth reply to keep conversation flowing. Under 20 words.";

    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json({ result: "DIAGNOSTIC: GROQ_API_KEY is missing from Vercel environment variables." });
    }

    // Call Groq directly
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Returns the exact Groq rejection message to your chat window
      return NextResponse.json({ result: `GROQ API REJECTION: ${data.error?.message || response.statusText}` });
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ result: "DIAGNOSTIC: Groq returned an empty response." });
    }

    return NextResponse.json({ result: text.trim() });

  } catch (error) {
    // Returns the exact server exception message to your chat window
    return NextResponse.json({ result: `SERVER EXCEPTION: ${error.message}` });
  }
}
