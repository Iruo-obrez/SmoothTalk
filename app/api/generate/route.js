import { NextResponse } from 'next/server';

// Helper: Call primary Google Gemini API
async function callGemini(payload, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

// Helper: Fallback call to Groq (Llama 3.1 8B)
async function callGroqFallback(prompt, systemPrompt, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

export async function POST(req) {
  try {
    const { query, mode } = await req.json();

    const complimentPrompt = "You are a naturally charming, calm, and effortlessly cool person texting someone you vibe with. Write ONE short, casual, and subtly flirty text or compliment based on the input. Keep it under 20 words.";
    const followupPrompt = "You are a naturally charismatic, witty, and laid-back texter. Write ONE short, clever, and smooth reply that keeps the conversation flowing. Keep it under 20 words.";

    const systemPrompt = mode === 'compliment' ? complimentPrompt : followupPrompt;
    
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // 1. Primary Try: Google Gemini
    if (geminiKey) {
      try {
        const payload = {
          contents: [{ parts: [{ text: query }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
        };
        
        const geminiResult = await callGemini(payload, geminiKey);
        if (geminiResult) {
          return NextResponse.json({ result: geminiResult.trim() });
        }
      } catch (geminiError) {
        console.warn("Gemini busy/down. Switching to Groq fallback...", geminiError.message);
      }
    }

    // 2. Secondary Fallback: Groq API
    if (groqKey) {
      try {
        const groqResult = await callGroqFallback(query, systemPrompt, groqKey);
        if (groqResult) {
          return NextResponse.json({ result: groqResult.trim() });
        }
      } catch (groqError) {
        console.error("Groq fallback also failed:", groqError.message);
      }
    }

    return NextResponse.json(
      { result: "Service is temporarily busy. Please try again in a few seconds." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Route Handler Error:", error);
    return NextResponse.json({ result: "Server error handling request." }, { status: 500 });
  }
}
