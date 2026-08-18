import { api } from "@/lib/api/axios";
import { OPENAI_MODEL } from "../constants";
import type { AICompletionRequest, AICompletionResult } from "../types";

let backendConfigured = false;

/** Client never holds an OpenAI key. Completions go through the backend proxy. */
export function isOpenAIConfigured(): boolean {
  return backendConfigured;
}

export async function completeWithOpenAI(req: AICompletionRequest): Promise<AICompletionResult> {
  try {
    const { data } = await api.post<AICompletionResult>("/api/ai/complete", {
      system: req.system,
      user: req.user,
      maxTokens: req.maxTokens ?? 512,
      temperature: req.temperature ?? 0.4,
      model: OPENAI_MODEL,
    });
    backendConfigured = data?.source === "openai";
    return {
      text: data?.text ?? "",
      source: data?.source === "openai" ? "openai" : "rules",
      tokensUsed: data?.tokensUsed,
    };
  } catch {
    backendConfigured = false;
    return { text: "", source: "rules" };
  }
}

export async function completeWithRetry(req: AICompletionRequest): Promise<AICompletionResult> {
  const first = await completeWithOpenAI(req);
  if (first.text) return first;
  return completeWithOpenAI(req);
}
