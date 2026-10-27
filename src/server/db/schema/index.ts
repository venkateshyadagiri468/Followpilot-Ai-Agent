import {
  pgEnum,
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";

// Enum types
export const leadStatus = pgEnum("lead_status", [
  "NEW",
  "CONTACTED",
  "REPLIED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
  "DORMANT",
]);

export const taskStatus = pgEnum("task_status", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
]);

export const taskPriority = pgEnum("task_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const activityType = pgEnum("activity_type", [
  "EMAIL_SENT",
  "EMAIL_RECEIVED",
  "PROPOSAL_SENT",
  "PROPOSAL_RECEIVED",
  "CALL_LOGGED",
  "MEETING_SCHEDULED",
  "MEETING_COMPLETED",
  "FOLLOW_UP_CREATED",
  "FOLLOW_UP_COMPLETED",
]);

export const recommendationAction = pgEnum("recommendation_action", [
  "SEND_EMAIL",
  "SCHEDULE_CALL",
  "WAIT",
  "ESCALATE",
  "STOP",
]);

export const recommendationStatus = pgEnum("recommendation_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SENT",
  "FAILED",
]);

export const auditAction = pgEnum("audit_action", [
  "LEAD_CREATE",
  "LEAD_UPDATE",
  "LEAD_STATUS_CHANGE",
  "RECOMMENDATION_GENERATE",
  "DRAFT_APPROVE",
  "DRAFT_REJECT",
  "EMAIL_SEND",
  "EMAIL_DELIVERED",
  "EMAIL_BOUNCED",
  "EMAIL_FAILED",
  "TASK_CREATE",
  "TASK_COMPLETE",
  "TASK_CANCEL",
  "USER_SIGN_IN",
  "USER_SIGN_OUT",
]);

export const auditEntity = pgEnum("audit_entity", [
  "LEAD",
  "RECOMMENDATION",
  "DRAFT",
  "EMAIL",
  "TASK",
  "USER",
]);

// Table definitions
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  userId: text("user_id").notNull(),
  role: text("role").default("owner").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),

    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    status: leadStatus("status").default("NEW").notNull(),

    dealValue: numeric("deal_value", { precision: 12, scale: 2 }),

    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("leads_org_idx").on(table.organizationId),
    index("leads_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),

  type: activityType("type").notNull(),
  actor: text("actor"),
  metadata: text("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const followUpTasks = pgTable("follow_up_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  priority: taskPriority("priority").default("MEDIUM").notNull(),
  status: taskStatus("status").default("PENDING").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),

  channel: text("channel").notNull(),
  subject: text("subject"),
  externalThreadId: text("external_threadId"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),

  direction: text("direction").notNull(), // inbound, outbound
  body: text("body").notNull(),
  providerMessageId: text("providerMessageId"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiRecommendations = pgTable("ai_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),

  action: recommendationAction("action").notNull(),
  rationale: text("rationale").notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.5"),

  suggestedDelayHours: numeric("suggested_delay_hours", {
    precision: 5,
    scale: 2,
  }),

  status: recommendationStatus("status").default("PENDING").notNull(),
  modelVersion: text("modelVersion"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  executedAt: timestamp("executed_at", { withTimezone: true }),

  evidenceIds: text("evidence_ids").array(),
});

export const messageDrafts = pgTable("message_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  recommendationId: uuid("recommendation_id")
    .notNull()
    .references(() => aiRecommendations.id, { onDelete: "cascade" }),

  version: integer("version").default(1).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").default("DRAFT").notNull(), // DRAFT, APPROVED, SENT, REJECTED

  approvedAt: timestamp("approved_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),

  idempotencyKey: text("idempotencyKey"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailDeliveries = pgTable("email_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  draftId: uuid("draft_id")
    .notNull()
    .references(() => messageDrafts.id, { onDelete: "cascade" }),

  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  providerMessageId: text("providerMessageId"),

  status: text("status").default("submitted").notNull(), // submitted, accepted, delivered, bounced, failed

  providerResponse: text("providerResponse"),
  providerError: text("providerError"),

  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),

  action: auditAction("action").notNull(),
  entity: auditEntity("entity"),
  entityId: uuid("entity_id"),

  actor: text("actor"),
  metadata: text("metadata"),

  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});