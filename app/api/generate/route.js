import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { query, mode } = await req.json();

    const complimentPrompt = "You are 'The Compliment Architect,' a master of smooth pickup lines. Generate ONE single, clever compliment under 30 words based on the input.";
    const followupPrompt = "You are 'The Follow-Up Generator,' a witty conversation expert. Generate ONE single engaging response under 30 words based on the input.";

    const systemPrompt = mode === 'compliment' ? complimentPrompt : followupPrompt;
    const apiKey = process.env.GEMINI_API_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    return NextResponse.json({ result: resultText });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate response." }, { status: 500 });
  }
}
