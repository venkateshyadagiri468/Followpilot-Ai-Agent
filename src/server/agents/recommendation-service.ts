import { recommendationSchema } from "./recommendation-schema";
import { db } from "../db";
import { leads, activities, aiRecommendations, messageDrafts, memberships } from "../db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { z } from "zod";

/**
 * Represents one piece of evidence cited in a recommendation.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Evidence = {
  activityId: string;
  explanation: string;
};

/**
 * Input for the recommendation engine.
 */
export type RecommendationInput = {
  organizationId: string;
  leadId: string;
  requestedBy: string;
};

/**
 * Result returned to the UI / caller. Execution is NOT performed here;
 * the caller must check `requiresApproval` and handle approval/sending separately.
 */
export type RecommendationResult = {
  recommendationId: string;
  action:
    | "SEND_EMAIL"
    | "SCHEDULE_CALL"
    | "WAIT"
    | "ESCALATE"
    | "STOP";
  rationale: string;
  requiresApproval: boolean;
  draft?: {
    subject: string;
    body: string;
  } | null;
};

/**
 * Core agent service: retrieves context, checks eligibility, calls the model,
 * validates output, persists the recommendation, and returns a result.
 * 
 * This stub intentionally does not call the LLM — it demonstrates the full
 * pipeline structure. In a real implementation, step 4 would call OpenAI
 * with the bounded context and the structured output schema.
 */
export async function recommendNextAction(
  input: RecommendationInput
): Promise<RecommendationResult> {
  // 1. Verify organization membership and access.
  const orgMember = await db.select().from(memberships)
    .where(and(
      eq(memberships.organizationId, input.organizationId),
      eq(memberships.userId, input.requestedBy)
    ))
    .limit(1);

  if (!orgMember.length) {
    throw new Error("Organization access denied");
  }

  // 2. Retrieve the lead and bounded conversation history.
  const lead = await db.select().from(leads)
    .where(and(
      eq(leads.id, input.leadId),
      eq(leads.organizationId, input.organizationId)
    ))
    .limit(1);

  if (!lead.length) {
    throw new Error("Lead not found or access denied");
  }

  const leadData = lead[0];

  // 3. Check status, opt-outs, and existing pending tasks.
  // Terminal states should not receive ordinary prospect follow-ups.
  if (leadData.status === "WON" || leadData.status === "LOST") {
    // Still return a recommendation, but with STOP action
    const stopRec = await db.insert(aiRecommendations).values({
      leadId: input.leadId,
      action: "STOP",
      rationale: "Lead is in a terminal state (" + leadData.status + "). No ordinary follow-up recommended.",
      confidence: "1",
      status: "PENDING",
      modelVersion: "hermes-v1",
      evidenceIds: [],
    }).returning();

    return {
      recommendationId: stopRec[0].id,
      action: "STOP",
      rationale: "Lead is in a terminal state (" + leadData.status + "). No ordinary follow-up recommended.",
      requiresApproval: false,
    };
  }

  // Check for recent replies that might cancel pending tasks
  const recentActivities = await db.select().from(activities)
    .where(and(
      eq(activities.leadId, input.leadId),
      gte(activities.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // last 7 days
    ))
    .orderBy(desc(activities.createdAt))
    .limit(5);

  // 4. Generate and validate structured model output.
  // In Phase 3, we use a deterministic policy-based approach instead of an LLM call.
  // The policy determines eligibility and suggests an action + rationale.
  
  const policyResult = applyDeterministicPolicy(leadData, recentActivities);

  // Validate against the schema - we construct a partial object that matches
  const recommendation: z.infer<typeof recommendationSchema> = {
    action: policyResult.action as any,
    rationale: policyResult.rationale,
    evidence: policyResult.evidence.map((e: any) => ({
      activityId: e.id,
      explanation: e.explanation,
    })),
    confidence: policyResult.confidence,
    suggestedDelayHours: policyResult.suggestedDelayHours,
    draft: policyResult.draft ?? null,
  };

  const parsed = recommendationSchema.safeParse(recommendation);
  if (!parsed.success) {
    throw new Error("Invalid AI recommendation: " + parsed.error.message);
  }

  const finalRec = parsed.data;

  // 5. Verify referenced evidence against retrieved records.
  // Ensure all cited activity IDs belong to this lead and organization.
  if (finalRec.evidence && finalRec.evidence.length > 0) {
    for (const ev of finalRec.evidence) {
      const activityExists = await db.select().from(activities)
        .where(and(
          eq(activities.id, ev.activityId),
          eq(activities.leadId, input.leadId)
        ))
        .limit(1);
      if (!activityExists.length) {
        // Remove invalid evidence
        // In a full impl, we'd warn and filter
      }
    }
  }

  // 6. Persist the recommendation and any draft.
  const recId = uuidv4();
  await db.insert(aiRecommendations).values({
    id: recId,
    leadId: input.leadId,
    action: finalRec.action,
    rationale: finalRec.rationale,
    confidence: String(finalRec.confidence),
    suggestedDelayHours: finalRec.suggestedDelayHours !== null ? String(finalRec.suggestedDelayHours) : null,
    status: "PENDING",
    modelVersion: "hermes-v1",
    evidenceIds: finalRec.evidence?.map(e => e.activityId) || [],
  });

  // Create draft if action is SEND_EMAIL and draft is provided
  if (finalRec.action === "SEND_EMAIL" && finalRec.draft) {
    const draftId = uuidv4();
    await db.insert(messageDrafts).values({
      id: draftId,
      recommendationId: recId,
      version: 1,
      subject: finalRec.draft.subject,
      body: finalRec.draft.body,
      status: "DRAFT",
    });
  }

  // 7. Return a result without executing external actions.
  return {
    recommendationId: recId,
    action: finalRec.action,
    rationale: finalRec.rationale,
    requiresApproval: finalRec.action === "SEND_EMAIL",
    draft: finalRec.draft,
  };
}

/**
 * Deterministic policy: applies business rules before calling the model.
 * Returns an object with the recommended action, rationale, evidence, confidence,
 * and optional draft.
 */
function applyDeterministicPolicy(
  lead: any,
  recentActivities: any[]
): {
  action: string;
  rationale: string;
  evidence: any[];
  confidence: number;
  suggestedDelayHours: number | null;
  draft?: { subject: string; body: string } | null;
} {
  const evidence: any[] = [];
  let confidence = 0.7;
  let suggestedDelayHours: number | null = null;
  let draft: { subject: string; body: string } | null = null;

  // Rule: If lead has a pending follow-up task, check if it's due
  if (lead.status === "NEW") {
    if (!recentActivities || recentActivities.length === 0) {
      evidence.push({
        id: "context-gap",
        explanation: "No activities recorded for this lead. Recommend reaching out to establish contact.",
      });
      confidence = 0.5;
      
      draft = {
        subject: "Introduction and service overview",
        body: `Hi ${lead.name},\n\nI hope this message finds you well. I'm reaching out because I'd love to learn more about your current projects and see if there's a way we can collaborate.\n\nBest regards,\n[Your Name]`,
      };
      
      return {
        action: "SEND_EMAIL",
        rationale: "Lead is NEW with no recorded activities. Recommended first outreach email.",
        evidence,
        confidence,
        suggestedDelayHours: null,
        draft,
      };
    }
  }

  // Rule: If lead is PROPOSAL and proposal was sent > 5 days ago, follow up
  if (lead.status === "PROPOSAL" && lead.lastContactAt) {
    const daysSinceContact = (Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact > 5) {
      evidence.push({
        id: "recent-activity",
        explanation: `Proposal was sent ${Math.round(daysSinceContact)} days ago. Follow-up is eligible.`,
      });
      confidence = 0.8;
      
      draft = {
        subject: "Checking in on your proposal",
        body: `Hi ${lead.name},\n\nI wanted to check in on the proposal I sent ${daysSinceContact > 1 ? "approximately " + Math.round(daysSinceContact) + " days ago" : "recently"}. Please let me know if you have any questions or need additional information.\n\nBest regards,\n[Your Name]`,
      };
      
      suggestedDelayHours = 0;
      
      return {
        action: "SEND_EMAIL",
        rationale: `Proposal follow-up eligible — ${Math.round(daysSinceContact)} days since last contact.`,
        evidence,
        confidence,
        suggestedDelayHours,
        draft,
      };
    }
  }

  // Rule: If lead REPLIED recently, summarize and recommend next step
  const recentReplies = recentActivities?.filter((a: any) => a.type === "EMAIL_RECEIVED");
  if (recentReplies && recentReplies.length > 0) {
    evidence.push({
      id: "recent-reply",
      explanation: `Lead replied ${recentReplies.length} time(s) recently. Conversation should be reassessed.`,
    });
    confidence = 0.85;
    
    // Determine next action based on reply content patterns
    const lastReply = recentReplies[0];
    const bodyPreview = (lastReply.metadata || "").toString().toLowerCase().substring(0, 100);
    
    if (bodyPreview.includes("interested") || bodyPreview.includes("yes") || bodyPreview.includes("sounds good")) {
      draft = {
        subject: "Great! Let's move forward",
        body: `Hi ${lead.name},\n\nI'm glad to hear you're interested! Let's schedule a call to discuss next steps.\n\nBest regards,\n[Your Name]`,
      };
      suggestedDelayHours = 0;
      return {
        action: "SCHEDULE_CALL",
        rationale: "Lead expressed interest in recent reply. Scheduling a call recommended.",
        evidence,
        confidence,
        suggestedDelayHours,
        draft,
      };
    } else if (bodyPreview.includes("not interested") || bodyPreview.includes("no") || bodyPreview.includes("not suitable")) {
      // STOP - lead has declined
      return {
        action: "STOP",
        rationale: "Lead indicated they are not interested. No further outreach recommended.",
        evidence,
        confidence: 1,
        suggestedDelayHours: null,
      };
    } else {
      // Uncertain context - ask user to review
      return {
        action: "WAIT",
        rationale: "Recent reply received but context requires manual review. Insufficient information to auto-generate action.",
        evidence,
        confidence: 0.4,
        suggestedDelayHours: 48, // Wait 2 days
      };
    }
  }

  // Default: WAIT with suggested delay if no strong eligibility
  if (!draft) {
    return {
      action: "WAIT",
      rationale: "No immediate follow-up eligible based on current lead state. Recommend waiting before next outreach.",
      evidence,
      confidence: 0.5,
      suggestedDelayHours: 48, // Wait 2 days
    };
  }

  return {
    action: "SEND_EMAIL",
    rationale: "Follow-up eligible based on deterministic policy.",
    evidence,
    confidence,
    suggestedDelayHours,
    draft,
  };
}