/**
 * AIService - Integrazione Vercel AI SDK per estrazione compiti dalle lezioni
 *
 * Provider supportati: openai, google, anthropic, groq, xai
 * Configurazione tramite variabili d'ambiente:
 *   AI_PROVIDER=openai|google|anthropic|groq|xai
 *   AI_MODEL=gpt-4o-mini|gemini-2.0-flash|...
 *   OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, XAI_API_KEY
 */

import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createGroq, groq } from "@ai-sdk/groq";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createXai, xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { z } from "zod";
import type {
  AIProvider,
  AIServiceOptions,
  CompitiEstrattiResponse,
  Lezione,
  LezioniResponse,
} from "../types/index.js";

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-2.0-flash",
  anthropic: "claude-3-5-haiku-20241022",
  groq: "llama-3.1-8b-instant",
  xai: "grok-3-mini",
};

const CompitiSchema = z.object({
  compiti: z.array(
    z.object({
      testo: z.string().describe("Descrizione completa del compito"),
      materia: z.string().describe("Nome della materia"),
      data_lezione: z.string().describe("Data della lezione (YYYY-MM-DD)"),
      scadenza: z.string().describe("Data di scadenza calcolata (YYYY-MM-DD)"),
      note: z.string().nullable().describe("Note aggiuntive, null se assenti"),
    }),
  ),
});

export class AIService {
  private provider: AIProvider;
  private model: string;
  private apiKey?: string;
  private temperature: number;

  constructor(options?: AIServiceOptions) {
    this.provider =
      options?.provider || (process.env.AI_PROVIDER as AIProvider) || "openai";
    this.model =
      options?.model || process.env.AI_MODEL || DEFAULT_MODELS[this.provider];
    this.apiKey = options?.apiKey;
    this.temperature = options?.temperature ?? 0.1;
  }

  private getModel() {
    switch (this.provider) {
      case "openai":
        return this.apiKey
          ? createOpenAI({ apiKey: this.apiKey })(this.model)
          : openai(this.model);
      case "google":
        return this.apiKey
          ? createGoogleGenerativeAI({ apiKey: this.apiKey })(this.model)
          : google(this.model);
      case "anthropic":
        return this.apiKey
          ? createAnthropic({ apiKey: this.apiKey })(this.model)
          : anthropic(this.model);
      case "groq":
        return this.apiKey
          ? createGroq({ apiKey: this.apiKey })(this.model)
          : groq(this.model);
      case "xai":
        return this.apiKey
          ? createXai({ apiKey: this.apiKey })(this.model)
          : xai(this.model);
      default:
        throw new Error(
          `Provider non supportato: ${this.provider}. Usa: openai, google, anthropic, groq, xai`,
        );
    }
  }

  private creaPrompt(lezioni: Lezione[]): string {
    const lezioniJSON = JSON.stringify(lezioni, null, 2);

    return `Sei un assistente che estrae compiti dalle lezioni scolastiche.
Analizza TUTTE le lezioni fornite e identifica TUTTI i compiti assegnati.

IMPORTANTE:
1. Per ogni compito trovato, calcola la data di scadenza basandoti su:
   - Indicazioni come "per domani", "per venerdì", "per la prossima settimana"
   - La data della lezione (evtDate) come punto di riferimento

2. Formatta SEMPRE le date nel formato ISO: YYYY-MM-DD

3. ESEMPI DI CALCOLO DATE:
   - Lezione lunedì 2025-09-15 + "per domani" → scadenza: 2025-09-16
   - Lezione lunedì 2025-09-15 + "per venerdì" → scadenza: 2025-09-19
   - Lezione venerdì 2025-09-19 + "per lunedì" → scadenza: 2025-09-22

4. Se non trovi compiti, restituisci un array vuoto.

LEZIONI DA ANALIZZARE:
${lezioniJSON}`;
  }

  /**
   * Estrae i compiti dalle lezioni usando un modello AI
   */
  async estraiCompiti(
    lezioniResponse: LezioniResponse,
    modello?: string,
  ): Promise<CompitiEstrattiResponse> {
    const modelName = modello || this.model;

    if (!lezioniResponse.lessons || lezioniResponse.lessons.length === 0) {
      return {
        compiti: [],
        metadata: {
          totale_lezioni: 0,
          totale_compiti: 0,
          modello_utilizzato: `${this.provider}/${modelName}`,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Se viene passato un modello diverso, crea una nuova istanza
    const service =
      modello && modello !== this.model
        ? new AIService({ ...this, model: modello })
        : this;

    const prompt = service.creaPrompt(lezioniResponse.lessons);

    const { object } = await generateObject({
      model: service.getModel(),
      schema: CompitiSchema,
      prompt,
      temperature: service.temperature,
    });

    return {
      compiti: object.compiti,
      metadata: {
        totale_lezioni: lezioniResponse.lessons.length,
        totale_compiti: object.compiti.length,
        modello_utilizzato: `${service.provider}/${service.model}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
