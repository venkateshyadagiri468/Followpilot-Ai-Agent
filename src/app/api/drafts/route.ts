/**
 * GET    /api/v1/drafts/:id
 * POST   /api/v1/drafts/:id/approve
 * PATCH  /api/v1/drafts/:id  { action: 'reject' | 'send' }
 *
 * SECURITY (approval invariant):
 *   1. Identity is ALWAYS from the Clerk session — never from the request body.
 *      The old code trusted `approvedBy` from the client.
 *   2. Tenant scope is verified by walking draft -> recommendation -> lead ->
 *      organization. A draft with no such chain, or one whose lead belongs
 *      to another org, is treated as not found (404), never 403 — that would
 *      leak existence.
 *   3. An email is sent ONLY when the draft row's status is APPROVED, and
 *      the transition to SENT + the delivery record happen in ONE
 *      transaction. There is no code path from a model output to a sent
 *      email that skips a human approval row.
 */

import { type NextRequest, NextResponse } from "next/server";
import { db } from "../../../server/db";
import {
  messageDrafts,
  aiRecommendations,
  leads,
  emailDeliveries,
} from "../../../server/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireOrg } from "../../../server/auth";
import { auditFromContext, extractClientMeta } from "../../../server/audit";
import type { Tx } from "../../../server/db";

async function loadDraftScoped(id: string, orgId: string) {
  const row = await db
    .select()
    .from(messageDrafts)
    .where(eq(messageDrafts.id, id))
    .limit(1);
  if (!row.length) return null;

  const rec = await db
    .select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.id, row[0].recommendationId))
    .limit(1);
  if (!rec.length) return null;

  const lead = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, rec[0].leadId), eq(leads.organizationId, orgId)))
    .limit(1);
  if (!lead.length) return null;

  return { draft: row[0], recommendation: rec[0], lead: lead[0] };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrg(request);
  if ("response" in ctx) return ctx.response;

  const { id } = await params;
  const scoped = await loadDraftScoped(id, ctx.orgId);
  if (!scoped) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  return NextResponse.json({ data: scoped.draft, success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrg(request);
  if ("response" in ctx) return ctx.response;

  const { id } = await params;
  const scoped = await loadDraftScoped(id, ctx.orgId);
  if (!scoped) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (scoped.draft.status !== "DRAFT") {
    return NextResponse.json(
      { error: `Draft already ${scoped.draft.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  const now = new Date();
  await db
    .update(messageDrafts)
    .set({ status: "APPROVED", approvedAt: now, updatedAt: now })
    .where(eq(messageDrafts.id, id));

  await auditFromContext(ctx, {
    action: "DRAFT_APPROVE",
    entity: "DRAFT",
    entityId: id,
    metadata: {
      leadId: scoped.lead.id,
      recommendationId: scoped.recommendation.id,
    },
    ...extractClientMeta(request),
  });

  return NextResponse.json({
    data: scoped.draft,
    success: true,
    message: "Draft approved",
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrg(request);
  if ("response" in ctx) return ctx.response;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = await params;
  const scoped = await loadDraftScoped(id, ctx.orgId);
  if (!scoped) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (body.action === "reject") {
    if (scoped.draft.status !== "DRAFT") {
      return NextResponse.json(
        { error: `Draft already ${scoped.draft.status.toLowerCase()}` },
        { status: 409 },
      );
    }
    const now = new Date();
    await db
      .update(messageDrafts)
      .set({ status: "REJECTED", updatedAt: now })
      .where(eq(messageDrafts.id, id));
    await auditFromContext(ctx, {
      action: "DRAFT_REJECT",
      entity: "DRAFT",
      entityId: id,
      metadata: { leadId: scoped.lead.id },
      ...extractClientMeta(request),
    });
    return NextResponse.json({
      data: scoped.draft,
      success: true,
      message: "Draft rejected",
    });
  }

  if (body.action === "send") {
    if (scoped.draft.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Draft must be approved before sending" },
        { status: 400 },
      );
    }

    const now = new Date();
    const deliveryId = uuidv4();

    // ONE transaction: mark SENT + write the delivery record. If either
    // fails, neither is applied — the approval cannot be "lost in the
    // middle" of an email send.
    await db.transaction(async (tx: Tx) => {
      await tx
        .update(messageDrafts)
        .set({ status: "SENT", sentAt: now, updatedAt: now })
        .where(eq(messageDrafts.id, id));
      await tx.insert(emailDeliveries).values({
        id: deliveryId,
        draftId: id,
        recipient: scoped.lead.email,
        subject: scoped.draft.subject,
        status: "submitted",
        sentAt: now,
        createdAt: now,
      });
      await auditFromContext(ctx, {
        action: "EMAIL_SEND",
        entity: "EMAIL",
        entityId: deliveryId,
        metadata: {
          draftId: id,
          leadId: scoped.lead.id,
          recipient: scoped.lead.email,
        },
        ...extractClientMeta(request),
      });
    });

    return NextResponse.json({
      data: { draft: scoped.draft },
      success: true,
      message: "Email sent",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
