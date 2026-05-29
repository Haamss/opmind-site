import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[coach-insights] ANTHROPIC_API_KEY missing in .env.local — insights endpoint will return 500 until the key is set."
  );
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { period, sessions, totalShots, hfMoyen, types, topTags } =
      await request.json();

    if (!sessions || sessions.length < 1) {
      return NextResponse.json(
        { error: "insufficient_data" },
        { status: 400 }
      );
    }

    const prompt = `Tu es un coach de tir sportif IPSC expert. Analyse ces données d'entraînement et génère 3 insights concis et actionnables en français.

Données du tireur (période : ${period}) :
- Nombre de sessions : ${sessions.length}
- Coups totaux : ${totalShots}
- Hit Factor moyen : ${hfMoyen || "non disponible"}
- Types de séances : ${types || "non spécifié"}
- Tags fréquents : ${topTags || "aucun"}

Règles :
- Sois direct et précis comme un coach militaire, pas un motivateur
- Chaque insight doit identifier un pattern spécifique et proposer un drill concret
- Utilise le vocabulaire IPSC (hit factor, A-zone, splits, draw, transition)
- Jamais de bullet points dans les textes

Réponds UNIQUEMENT en JSON valide sans markdown :
{ "insights": [{ "title": string, "pattern": string, "recommendation": string }] }`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Coach insights error:", error);
    return NextResponse.json({ error: "api_error" }, { status: 500 });
  }
}
