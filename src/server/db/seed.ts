import { db } from "./index";
import { leads, organizations, memberships, activities } from "./schema";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  const orgId = uuidv4();

  await db.insert(organizations).values({
    id: orgId,
    name: "Acme Freelance Studio",
    createdAt: new Date(),
  });

  const userId = "user_test_123";
  await db.insert(memberships).values({
    organizationId: orgId,
    userId,
    role: "owner",
    createdAt: new Date(),
  });

  const sampleLeads = [
    {
      name: "Sarah Chen",
      email: "sarah@techstart.io",
      company: "TechStart IO",
      status: "NEW" as const,
      dealValue: "5000.00",
    },
    {
      name: "Marcus Reed",
      email: "marcus@designlab.co",
      company: "DesignLab Co",
      status: "PROPOSAL" as const,
      dealValue: "12000.00",
      lastContactAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      name: "Priya Patel",
      email: "priya@cloudops.io",
      company: "CloudOps IO",
      status: "REPLIED" as const,
      dealValue: "8000.00",
      lastContactAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      name: "Tom Becker",
      email: "tom@becker-law.com",
      company: "Becker & Associates",
      status: "WON" as const,
      dealValue: "15000.00",
    },
    {
      name: "Lisa Wang",
      email: "lisa@brightmetrics.io",
      company: "BrightMetrics",
      status: "LOST" as const,
      dealValue: "3000.00",
    },
    {
      name: "James Okafor",
      email: "james@innovate.dev",
      company: "InnovateDev",
      status: "CONTACTED" as const,
      dealValue: "7500.00",
      lastContactAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const lead of sampleLeads) {
    const [inserted] = await db
      .insert(leads)
      .values({ ...lead, organizationId: orgId })
      .returning();

    if (lead.status === "REPLIED") {
      await db.insert(activities).values({
        leadId: inserted.id,
        type: "EMAIL_RECEIVED",
        actor: lead.email,
        metadata: "Hi, I'm interested in moving forward. Let's schedule a call.",
        createdAt: new Date(),
      });
    }
    if (lead.status === "PROPOSAL") {
      await db.insert(activities).values({
        leadId: inserted.id,
        type: "PROPOSAL_SENT",
        actor: userId,
        metadata: "Sent proposal for Q4 engagement",
        createdAt: lead.lastContactAt!,
      });
    }
  }

  console.log("Seed complete. Organization ID:", orgId);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });