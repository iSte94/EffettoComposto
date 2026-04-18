/**
 * Estrazione automatica di fatti memorizzabili dall'ultimo scambio.
 *
 * Chiede al modello LLM di analizzare l'ultimo scambio user+assistant e
 * produrre una lista JSON di "fatti" stabili da persistere nella memoria
 * dell'utente (preferenze, obiettivi, decisioni, profilo, contesto).
 *
 * Il risultato viene POSTato su /api/ai/memory con source=auto.
 * Fallisce silenziosamente (non blocca la chat).
 */

import prisma from "@/lib/prisma";
import { chat } from "@/lib/ai/providers";
import type { AiChatMessage, AiProvider } from "@/lib/ai/providers";

export interface ExtractMemoryArgs {
    userId: string;
    provider: AiProvider;
    apiKey: string;
    model: string;
    userMessage: string;
    assistantMessage: string;
}

const EXTRACT_SYSTEM_PROMPT = `Sei un analista che legge una breve conversazione (user + assistant) e estrae SOLO fatti personali stabili da memorizzare per conversazioni future.

REGOLE:
- Estrai SOLO fatti durevoli (mesi/anni), NON contenuti della singola conversazione.
- NON estrarre calcoli, numeri temporanei, risultati di simulazioni.
- SI estrarre: obiettivi esplicitati, preferenze di rischio/strumenti, vincoli personali, decisioni strategiche prese, dati biografici rilevanti, esperienze passate significative.
- Ogni fatto: max 250 char, terza persona ("l'utente..."), neutrale.
- Se non ci sono fatti da memorizzare, ritorna array vuoto.

Categorie ammesse:
- "profilo" = dati stabili (eta', famiglia, lavoro, locazione, reddito strutturale)
- "obiettivo" = target FIRE, target risparmio, orizzonti
- "decisione" = scelte strategiche (PAC mensile, liquidazione posizione, piani)
- "preferenza" = gusti su strumenti, rischio, strategie
- "contesto" = altri fatti rilevanti (es. "ha un mutuo a 30 anni al 3.5%")

RISPONDI ESCLUSIVAMENTE con JSON valido, nessun testo prima o dopo:
{
  "facts": [
    { "category": "obiettivo", "fact": "L'utente punta a FIRE a 55 anni con 1.2M EUR di patrimonio." }
  ]
}`;

interface ExtractedFact {
    category: string;
    fact: string;
}

export async function extractAndPersistMemory(args: ExtractMemoryArgs): Promise<ExtractedFact[]> {
    const { userId, provider, apiKey, model, userMessage, assistantMessage } = args;
    if (!userMessage.trim() || !assistantMessage.trim()) return [];

    const messages: AiChatMessage[] = [
        {
            role: "user",
            content: `Ultimo scambio:\n\n--- USER ---\n${userMessage}\n\n--- ASSISTANT ---\n${assistantMessage}\n\nEstrai i fatti durevoli in JSON.`,
        },
    ];

    let result;
    try {
        result = await chat({
            provider,
            apiKey,
            model,
            systemPrompt: EXTRACT_SYSTEM_PROMPT,
            messages,
            maxToolRoundtrips: 0,
        });
    } catch {
        return [];
    }

    // Parse JSON dalla risposta (tolleriamo wrapper ```json)
    let parsed: { facts?: ExtractedFact[] } = {};
    try {
        const cleaned = result.text
            .replace(/```json\s*/gi, "")
            .replace(/```\s*$/g, "")
            .trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
    } catch {
        return [];
    }

    const facts = (parsed.facts ?? []).filter(
        (f) => typeof f === "object" && typeof f.fact === "string" && f.fact.trim().length > 0,
    );
    if (facts.length === 0) return [];

    const persisted: ExtractedFact[] = [];
    await Promise.all(
        facts.slice(0, 8).map(async (f) => {
            try {
                const existing = await prisma.assistantMemory.findFirst({
                    where: {
                        userId,
                        category: f.category,
                        fact: f.fact.slice(0, 500),
                    },
                });
                if (existing) {
                    await prisma.assistantMemory.update({
                        where: { id: existing.id },
                        data: {
                            updatedAt: new Date(),
                            source: "auto",
                        },
                    });
                } else {
                    await prisma.assistantMemory.create({
                        data: {
                            userId,
                            category: f.category,
                            fact: f.fact.slice(0, 500),
                            source: "auto",
                        },
                    });
                }
                persisted.push(f);
            } catch {
                /* noop */
            }
        }),
    );
    return persisted;
}
