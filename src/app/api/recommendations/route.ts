import { db } from "../../../server/db";
import { aiRecommendations, leads, organizations, memberships } from "../../../server/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { recommendNextAction } from "../../../server/agents/recommendation-service";

// POST /api/v1/recommendations - Request an AI recommendation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId, leadId, requestedBy } = body;

    // Verify organization access
    const orgMember = await db.select().from(memberships)
      .where(and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.userId, requestedBy),
      ))
      .limit(1);

    if (!orgMember.length) {
      return NextResponse.json({ error: "Organization access denied" }, { status: 403 });
    }

    // Verify lead belongs to organization
    const lead = await db.select().from(leads)
      .where(and(
        eq(leads.id, leadId),
        eq(leads.organizationId, organizationId),
      ))
      .limit(1);

    if (!lead.length) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Call the recommendation service
    const input = {
      organizationId,
      leadId,
      requestedBy,
    };

    const result = await recommendNextAction(input);

    return NextResponse.json({ data: result, success: true });
  } catch (error: any) {
    console.error("Error generating recommendation:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}