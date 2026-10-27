import { db } from "../../../server/db";
import { messageDrafts, aiRecommendations, emailDeliveries } from "../../../server/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";

// GET /api/v1/drafts/:id - Get a specific draft
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    const draft = await db.select().from(messageDrafts)
      .where(eq(messageDrafts.id, id))
      .limit(1);

    if (!draft.length) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ data: draft[0], success: true });
  } catch (error) {
    console.error("Error fetching draft:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/drafts/:id/approve - Approve a specific draft version
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approvedBy } = body;

    const draft = await db.select().from(messageDrafts)
      .where(eq(messageDrafts.id, id))
      .limit(1);

    if (!draft.length) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // Update draft status to APPROVED
    await db.update(messageDrafts)
      .set({
        status: "APPROVED",
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messageDrafts.id, id));

    return NextResponse.json({ data: draft[0], success: true, message: "Draft approved" });
  } catch (error) {
    console.error("Error approving draft:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/drafts/:id/reject - Reject a draft
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body; // "reject" or "send"

    const draft = await db.select().from(messageDrafts)
      .where(eq(messageDrafts.id, id))
      .limit(1);

    if (!draft.length) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (action === "reject") {
      // Update draft status to REJECTED
      await db.update(messageDrafts)
        .set({
          status: "REJECTED",
          updatedAt: new Date(),
        })
        .where(eq(messageDrafts.id, id));

      return NextResponse.json({ data: draft[0], success: true, message: "Draft rejected" });
    }

    if (action === "send") {
      // Check that draft is approved
      if (draft[0].status !== "APPROVED") {
        return NextResponse.json({ error: "Draft must be approved before sending" }, { status: 400 });
      }

      // Check that there's a valid recommendation
      const recommendation = await db.select().from(aiRecommendations)
        .where(eq(aiRecommendations.id, draft[0].recommendationId))
        .limit(1);

      if (!recommendation.length) {
        return NextResponse.json({ error: "No associated recommendation found" }, { status: 404 });
      }

      // Create email delivery record
      await db.insert(emailDeliveries).values({
        id: uuidv4(),
        draftId: id,
        recipient: "pending-recipient",
        subject: draft[0].subject,
        status: "submitted",
        providerMessageId: null,
        sentAt: new Date(),
        createdAt: new Date(),
      });

      // Update draft status to SENT
      await db.update(messageDrafts)
        .set({
          status: "SENT",
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(messageDrafts.id, id));

      return NextResponse.json({ data: { draft: draft[0] }, success: true, message: "Email queued for delivery" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing draft:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}