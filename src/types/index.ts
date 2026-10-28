export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  dealValue: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  recommendationId: string;
  action: "SEND_EMAIL" | "SCHEDULE_CALL" | "WAIT" | "ESCALATE" | "STOP";
  rationale: string;
  requiresApproval: boolean;
  draft: { subject: string; body: string } | null;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
}