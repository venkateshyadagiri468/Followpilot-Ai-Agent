import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as allSchema from "./schema";

// Re-export schema members for convenient importing
export {
  leads,
  organizations,
  memberships,
  activities,
  followUpTasks,
  conversations,
  messages,
  aiRecommendations,
  messageDrafts,
  emailDeliveries,
  auditEvents,
  leadStatus,
  taskStatus,
  taskPriority,
  activityType,
  recommendationAction,
  recommendationStatus,
  auditAction,
  auditEntity,
} from "./schema";

// Create the database connection
const client = postgres(process.env.DATABASE_URL!, { max: 10 });

export const db = drizzle(client, { schema: allSchema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];