import { Lead } from "@/types/index";

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-cyan-100 text-cyan-700",
  REPLIED: "bg-purple-100 text-purple-700",
  QUALIFIED: "bg-emerald-100 text-emerald-700",
  PROPOSAL: "bg-amber-100 text-amber-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  DORMANT: "bg-gray-100 text-gray-600",
};

export default function LeadCard({ lead, onRecommend }: { lead: Lead; onRecommend: (lead: Lead) => void }) {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{lead.name}</h3>
          <p className="text-sm text-gray-500">{lead.company}</p>
          <p className="text-xs text-gray-400 mt-1">{lead.email}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[lead.status] || "bg-gray-100"}`}>
          {lead.status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-bold text-emerald-600">
          {lead.dealValue ? `$${parseFloat(lead.dealValue).toLocaleString()}` : "—"}
        </span>
        <button
          onClick={() => onRecommend(lead)}
          disabled={lead.status === "WON" || lead.status === "LOST"}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Get recommendation →
        </button>
      </div>
    </div>
  );
}
