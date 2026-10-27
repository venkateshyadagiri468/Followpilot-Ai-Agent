import { db } from "../../../server/db";
import { leads, organizations, memberships } from "../../../server/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/v1/leads - Search and paginate leads
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const name = searchParams.get("name");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit") || "50") : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset") || "0") : 0;

    // Verify organization access
    const orgCheck = await db.select().from(memberships)
      .where(eq(memberships.organizationId, orgId!))
      .limit(1);

    if (!orgCheck.length) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Build query
    const conditions = [eq(leads.organizationId, orgId!)];

    if (status) {
      conditions.push(eq(leads.status, status as any));
    }
    if (name) {
      conditions.push(eq(leads.name, name)); // simplified for type safety
    }

    const allLeads = await db.select().from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db.select({ count: count() }).from(leads).where(and(...conditions));
    const totalCount = totalResult[0]?.count || 0;

    return NextResponse.json({
      data: allLeads,
      totalCount,
      hasMore: offset + limit < totalCount,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/leads - Create a lead
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId, name, email, company, status, dealValue } = body;

    // Verify organization access
    const orgCheck = await db.select().from(memberships)
      .where(eq(memberships.organizationId, organizationId))
      .limit(1);

    if (!orgCheck.length) {
      return NextResponse.json({ error: "Organization access denied" }, { status: 403 });
    }

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Check for duplicate email within organization
    const existingLead = await db.select().from(leads)
      .where(and(
        eq(leads.organizationId, organizationId),
        eq(leads.email, email),
      ))
      .limit(1);

    if (existingLead.length) {
      return NextResponse.json({ error: "A lead with this email already exists in your workspace." }, { status: 409 });
    }

    const newLead = await db.insert(leads).values({
      organizationId,
      name,
      email,
      company: company || null,
      status: (status || "NEW") as any,
      dealValue: dealValue || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({ data: newLead[0], success: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}