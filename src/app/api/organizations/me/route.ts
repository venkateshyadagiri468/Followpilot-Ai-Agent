import { db } from "../../../../server/db";
import { memberships, organizations } from "../../../../server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse, NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// GET /api/v1/organizations/me - Get the current user's organization
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json(
        { error: "No organization found for user" },
        { status: 404 }
      );
    }

    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, membership[0].organizationId))
      .limit(1);

    return NextResponse.json({
      data: {
        organization: org[0] || null,
        membership: membership[0],
      },
    });
  } catch (error: any) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}