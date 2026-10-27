import { z } from "zod";

export const recommendationSchema = z.object({
  action: z.enum([
    "SEND_EMAIL",
    "SCHEDULE_CALL",
    "WAIT",
    "ESCALATE",
    "STOP",
  ]),
  rationale: z.string().min(1).max(1000),
  evidence: z.array(
    z.object({
      activityId: z.string().uuid(),
      explanation: z.string().min(1).max(300),
    })
  ).max(5),
  confidence: z.number().min(0).max(1),
  suggestedDelayHours: z.number().int().min(0).max(2160).nullable(),
  draft: z.object({
    subject: z.string().max(200),
    body: z.string().max(10000),
  }).nullable(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;