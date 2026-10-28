import type { Recommendation } from "@/types/index";

const actionLabels: Record<string, string> = {
  SEND_EMAIL: "Send Email",
  SCHEDULE_CALL: "Schedule Call",
  WAIT: "Wait",
  ESCALATE: "Escalate",
  STOP: "Stop",
};

const actionColors: Record<string, string> = {
  SEND_EMAIL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SCHEDULE_CALL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  WAIT: "bg-amber-50 text-amber-700 border-amber-200",
  ESCALATE: "bg-orange-50 text-orange-700 border-orange-200",
  STOP: "bg-red-50 text-red-700 border-red-200",
};

export default function RecommendationModal({
  recommendation,
  leadName,
  onClose,
  onApprove,
}: {
  recommendation: Recommendation;
  leadName: string;
  onClose: () => void;
  onApprove: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                AI Recommendation
              </h2>
              <p className="text-sm text-gray-500">for {leadName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${actionColors[recommendation.action] || ""}`}
          >
            {actionLabels[recommendation.action] || recommendation.action}
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Rationale
            </h3>
            <p className="mt-1 text-sm text-gray-700">
              {recommendation.rationale}
            </p>
          </div>

          {recommendation.draft && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Draft Email
              </h3>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500">Subject</p>
                <p className="text-sm font-semibold text-gray-900">
                  {recommendation.draft.subject}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-2">Body</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {recommendation.draft.body}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`px-2 py-0.5 rounded-full ${recommendation.requiresApproval ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
            >
              {recommendation.requiresApproval
                ? "Requires Approval"
                : "Auto-executable"}
            </span>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            {recommendation.requiresApproval && recommendation.draft && (
              <button
                onClick={onApprove}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Approve &amp; Queue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
