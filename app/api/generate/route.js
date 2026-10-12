import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { query, mode } = await req.json();

    if (!query || query.trim() === "") {
      return NextResponse.json({ result: "Please enter some text." }, { status: 400 });
    }

    const complimentPrompt = "You are a naturally charming, calm, and effortlessly cool person texting someone you vibe with. Write ONE short, casual, and subtly flirty text or compliment based on the input. Keep it under 20 words.";
    const followupPrompt = "You are a naturally charismatic, witty, and laid-back texter. Write ONE short, clever, and smooth reply that keeps the conversation flowing. Keep it under 20 words.";

    const systemPrompt = mode === 'compliment' ? complimentPrompt : followupPrompt;
    
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Try Groq First
    if (groqKey) {
      try {
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
        if (response.ok && data.choices?.[0]?.message?.content) {
          return NextResponse.json({ result: data.choices[0].message.content.trim() });
        }
      } catch (err) {
        console.warn("Groq failed, attempting Gemini backup...", err.message);
      }
    }

    // 2. Fallback to Gemini Backup
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
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
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (response.ok && text) {
          return NextResponse.json({ result: text.trim() });
        }
      } catch (err) {
        console.error("Gemini backup failed:", err.message);
      }
    }

    return NextResponse.json(
      { result: "Service is temporarily busy. Please verify your API keys on Vercel." },
      { status: 503 }
    );

  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json({ result: `Server Error: ${error.message}` }, { status: 500 });
  }
}
