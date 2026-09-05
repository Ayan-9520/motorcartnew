import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { CommosError } from "@/lib/commos/errors";
import { detectLanguage } from "@/lib/commos/crypto";
import { AGENT_TYPES } from "@/lib/commos/constants";
import { executeTool, qualityFromSignals } from "@/lib/commos/tools";
import type { CommActor } from "@/lib/commos/http";
import { isAdminRole, isDealerRole } from "@/lib/commos/http";
import { persistLeadQuality } from "@/services/sales-crm.service";
import { requireDealerContext, requireLeadForDealer } from "@/lib/sales-os/access";
import { createFollowUp } from "@/services/sales-crm.service";
import { notifyDealer } from "@/lib/sales-os/access";

function aiConfigured() {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  return Boolean(key) && !key.startsWith("sk-your");
}

const SAFETY =
  "Never guarantee loan approval, insurance claim, price, stock, discounts, dealer offers, valuation, finance rate, or payout. Use tool results only. Label pre-qualification as indicative. Do not invent inventory.";

export async function startConversation(actor: CommActor, input: { agentType?: string; leadId?: string; organizationId?: string }) {
  const agentType = (input.agentType ?? "VEHICLE_SALES").toUpperCase();
  if (!(AGENT_TYPES as readonly string[]).includes(agentType)) {
    throw new CommosError("Unknown agent", 400, "UNKNOWN_AGENT");
  }
  let orgId = input.organizationId ?? null;
  let dealerId: string | undefined;
  if (isDealerRole(actor.role) || isAdminRole(actor.role)) {
    const dealer = await requireDealerContext(actor).catch(() => null);
    dealerId = dealer?.id;
  }
  return prisma.aiConversation.create({
    data: {
      userId: actor.userId,
      organizationId: orgId,
      agentType,
      leadId: input.leadId,
      language: "en-IN",
      status: "OPEN",
    },
  });
}

export async function postMessage(
  actor: CommActor,
  conversationId: string,
  content: string,
  clientSystemPrompt?: unknown,
) {
  if (typeof clientSystemPrompt === "string" && clientSystemPrompt.trim()) {
    throw new CommosError("Arbitrary system prompt is not allowed", 403, "PROMPT_BLOCKED");
  }
  const conv = await prisma.aiConversation.findFirst({ where: { id: conversationId } });
  if (!conv) throw new CommosError("Conversation not found", 404, "NOT_FOUND");
  if (conv.userId !== actor.userId && !isAdminRole(actor.role)) {
    throw new CommosError("Forbidden", 403, "PII");
  }
  const language = detectLanguage(content);
  await prisma.aiMessage.create({
    data: { conversationId: conv.id, role: "user", language, content, labeledAi: false },
  });

  const policy = conv.organizationId
    ? await prisma.communicationPolicy.findUnique({ where: { organizationId: conv.organizationId } })
    : null;
  const meta = (policy?.metadata ?? {}) as { maxAiChatPerDay?: number };
  if (meta.maxAiChatPerDay) {
    const since = new Date(Date.now() - 86400000);
    const used = await prisma.aiUsageRecord.count({
      where: { organizationId: conv.organizationId, createdAt: { gte: since }, status: { in: ["OK", "FALLBACK"] } },
    });
    if (used >= meta.maxAiChatPerDay) throw new CommosError("AI plan limit reached", 429, "PLAN_LIMIT");
  }

  const configured = aiConfigured();
  let reply: string;
  if (!configured) {
    reply =
      language === "hi-IN"
        ? "AI provider configured nahi hai. Best Deal ranking inventory data se mil sakti hai."
        : "AI unavailable. You can still use Best Deal ranking from real inventory.";
  } else {
    reply =
      language === "hi-IN"
        ? "Main MotorCart tools se inventory check karke jawab dunga. Approval claim nahi karunga."
        : "I will answer using MotorCart tools only. I will not claim approvals.";
  }

  const assistant = await prisma.aiMessage.create({
    data: {
      conversationId: conv.id,
      role: "assistant",
      language,
      content: `${SAFETY}\n\n${reply}`,
      labeledAi: true,
    },
  });
  await prisma.aiConversation.update({ where: { id: conv.id }, data: { language } });
  await prisma.aiUsageRecord.create({
    data: {
      organizationId: conv.organizationId,
      userId: actor.userId,
      conversationId: conv.id,
      agentType: conv.agentType,
      provider: configured ? "openai" : "none",
      model: configured ? process.env.OPENAI_MODEL ?? "gpt-4o-mini" : null,
      units: configured ? null : 0,
      status: configured ? "OK" : "FALLBACK",
      costMetadata: {},
    },
  });
  return { message: assistant, aiAvailable: configured, language };
}

export async function runTool(actor: CommActor, conversationId: string, toolName: string, input: Record<string, unknown>) {
  const conv = await prisma.aiConversation.findFirst({ where: { id: conversationId } });
  if (!conv || (conv.userId !== actor.userId && !isAdminRole(actor.role))) {
    throw new CommosError("Forbidden", 403, "FORBIDDEN");
  }
  let dealerId: string | undefined;
  if (isDealerRole(actor.role) || isAdminRole(actor.role)) {
    const dealer = await requireDealerContext(actor).catch(() => null);
    dealerId = dealer?.id;
  }
  try {
    const output = await executeTool(
      { actor, conversationUserId: conv.userId, conversationOrgId: conv.organizationId, dealerId },
      toolName,
      input,
    );
    await prisma.aiToolExecution.create({
      data: {
        conversationId: conv.id,
        toolName,
        inputJson: input as Prisma.InputJsonValue,
        outputJson: output as Prisma.InputJsonValue,
        status: "OK",
      },
    });
    return output;
  } catch (e) {
    await prisma.aiToolExecution.create({
      data: {
        conversationId: conv.id,
        toolName,
        inputJson: input as Prisma.InputJsonValue,
        outputJson: { error: e instanceof Error ? e.message : "fail" } as Prisma.InputJsonValue,
        status: "FAILED",
      },
    });
    throw e;
  }
}

export async function qualifyLead(actor: CommActor, leadId: string, answers: {
  vehicleInterest?: string;
  budget?: string;
  timeline?: string;
  pincode?: string;
  financeRequired?: boolean;
  exchangeRequired?: boolean;
  preferredContact?: string;
  language?: string;
}) {
  const dealer = await requireDealerContext(actor);
  const lead = await requireLeadForDealer(dealer.id, leadId);
  const q = qualityFromSignals({
    hasVehicle: Boolean(answers.vehicleInterest || lead.vehicleInterest),
    hasBudget: Boolean(answers.budget),
    hasTimeline: Boolean(answers.timeline),
    hasPin: Boolean(answers.pincode || lead.pincode),
    financeRequired: Boolean(answers.financeRequired),
    exchangeRequired: Boolean(answers.exchangeRequired),
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      vehicleInterest: answers.vehicleInterest ?? lead.vehicleInterest,
      pincode: answers.pincode ?? lead.pincode,
      notes: [lead.notes, answers.preferredContact, answers.language].filter(Boolean).join(" | "),
      metadata: {
        ...((lead.metadata ?? {}) as object),
        budget: answers.budget,
        timeline: answers.timeline,
        financeRequired: answers.financeRequired,
        exchangeRequired: answers.exchangeRequired,
      },
    },
  });
  await persistLeadQuality(lead.id, {
    hasVehicle: Boolean(answers.vehicleInterest || lead.vehicleInterest),
    hasBudget: Boolean(answers.budget),
    hasTimeline: Boolean(answers.timeline),
    hasValidPin: Boolean(answers.pincode || lead.pincode),
    financeRequired: Boolean(answers.financeRequired),
    exchangeRequired: Boolean(answers.exchangeRequired),
  });
  return { leadId: lead.id, quality: q, serverOwned: true };
}

export async function summarizeCall(actor: CommActor, callSessionId: string) {
  const dealer = await requireDealerContext(actor);
  const transcript = await prisma.callTranscript.findFirst({
    where: { callSessionId, callSession: { dealerId: dealer.id } },
  });
  if (!transcript) throw new CommosError("Transcript required — will not invent summary", 400, "NO_TRANSCRIPT");
  const text = transcript.text;
  const summary = await prisma.aiCallSummary.create({
    data: {
      transcriptId: transcript.id,
      labeledAi: true,
      customerIntent: text.slice(0, 200),
      requirement: /suv|sedan|hatch/i.test(text) ? "vehicle interest mentioned in transcript" : null,
      budgetMention: text.match(/(\d+\s*lakh|₹\s*\d+)/i)?.[0] ?? null,
      followUp: "Confirm next step with customer",
      sentiment: "AI inference only",
      nextAction: "Human follow-up if needed",
      rawOutput: text.slice(0, 2000),
    },
  });
  return summary;
}

export async function handoff(actor: CommActor, conversationId: string, assigneeUserId?: string) {
  const conv = await prisma.aiConversation.findFirst({ where: { id: conversationId } });
  if (!conv) throw new CommosError("Conversation not found", 404, "NOT_FOUND");
  const dealer = await requireDealerContext(actor);
  const updated = await prisma.aiConversation.update({
    where: { id: conv.id },
    data: { handedOffAt: new Date(), handedOffTo: assigneeUserId ?? actor.userId, status: "HANDED_OFF" },
  });
  if (conv.leadId) {
    await createFollowUp(actor, {
      leadId: conv.leadId,
      title: "Human handoff from AI",
      dueAt: new Date(Date.now() + 3600000).toISOString(),
      description: "Continue from AI conversation context — customer should not repeat.",
    });
  }
  await notifyDealer(assigneeUserId ?? dealer.ownerId, "AI handoff", "A conversation needs a human agent", {
    conversationId: conv.id,
    dedupe_key: `handoff:${conv.id}`,
  });
  return updated;
}

export async function listUsage(actor: CommActor) {
  if (!isAdminRole(actor.role) && !isDealerRole(actor.role)) throw new CommosError("Forbidden", 403, "FORBIDDEN");
  const dealer = await requireDealerContext(actor).catch(() => null);
  const org = dealer
    ? await prisma.organization.findFirst({ where: { legacyDealerId: dealer.id } })
    : null;
  return prisma.aiUsageRecord.findMany({
    where: {
      OR: [{ userId: actor.userId }, ...(org ? [{ organizationId: org.id }] : [])],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
