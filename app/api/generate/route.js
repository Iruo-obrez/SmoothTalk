import { NextResponse } from 'next/server';

// Primary Call: Groq API (Llama 3.1 8B - 14,400 free requests/day)
async function callGroq(prompt, systemPrompt, apiKey) {
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

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Groq Error: ${response.status}`);
  }

  return data.choices?.[0]?.message?.content;
}

// Backup Call: Google Gemini API
async function callGemini(payload, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Gemini Error: ${response.status}`);
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

export async function POST(req) {
  try {
    const { query, mode } = await req.json();

    const complimentPrompt = "You are a naturally charming, calm, and effortlessly cool person texting someone you vibe with. Write ONE short, casual, and subtly flirty text or compliment based on the input. Keep it under 20 words.";
    const followupPrompt = "You are a naturally charismatic, witty, and laid-back texter. Write ONE short, clever, and smooth reply that keeps the conversation flowing. Keep it under 20 words.";

    const systemPrompt = mode === 'compliment' ? complimentPrompt : followupPrompt;
    
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Try Groq Primary
    if (groqKey) {
      try {
        const groqResult = await callGroq(query, systemPrompt, groqKey);
        if (groqResult) {
          return NextResponse.json({ result: groqResult.trim() });
        }
      } catch (groqError) {
        console.warn("Groq failed, switching to Gemini backup:", groqError.message);
      }
    }

    // 2. Try Gemini Backup
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
        console.error("Gemini backup error:", geminiError.message);
      }
    }

    return NextResponse.json({ result: "API key error. Please check your GROQ_API_KEY setting on Vercel." }, { status: 500 });
  } catch (error) {
    console.error("Route Handler Error:", error);
    return NextResponse.json({ result: "Server error processing request." }, { status: 500 });
  }
}
