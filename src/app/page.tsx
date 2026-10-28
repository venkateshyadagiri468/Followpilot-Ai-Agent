"use client";

import { useEffect, useState } from "react";
import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { Suspense } from "react";
import LeadCard from "@/components/LeadCard";
import RecommendationModal from "@/components/RecommendationModal";
import type { Lead, Recommendation } from "@/types/index";

function DashboardContent() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRec, setOpenRec] = useState<{
    rec: Recommendation;
    leadName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }
    void fetchLeads();
  }, [isLoaded, isSignedIn]);

  async function fetchLeads() {
    try {
      // First get the org
      const orgRes = await fetch("/api/organizations/me", {
        credentials: "include",
      });
      if (!orgRes.ok) throw new Error("Failed to fetch organization");
      const orgData = await orgRes.json();
      const orgId = orgData.data?.organization?.id;
      if (!orgId) throw new Error("No organization found");

      // Then fetch leads
      const leadsRes = await fetch(`/api/leads?organizationId=${orgId}`, {
        credentials: "include",
      });
      if (!leadsRes.ok) throw new Error("Failed to fetch leads");
      const leadsData = await leadsRes.json();
      setLeads(leadsData.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecommend(lead: Lead) {
    try {
      const orgRes = await fetch("/api/organizations/me", {
        credentials: "include",
      });
      const orgData = await orgRes.json();
      const orgId = orgData.data?.organization?.id;

      const recRes = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: orgId,
          leadId: lead.id,
          requestedBy: userId,
        }),
      });
      if (!recRes.ok) throw new Error("Failed to get recommendation");
      const recData = await recRes.json();
      setOpenRec({ rec: recData.data, leadName: lead.name });
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleApprove() {
    // For now just close - approval API can be added later
    setOpenRec(null);
  }

  const statusCounts = leads.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalActive = Object.values(statusCounts).reduce(
    (a: number, b: number) => a + b,
    0,
  );
  const openValue = leads
    .filter((l) => l.status !== "WON" && l.status !== "LOST")
    .reduce((sum, l) => sum + (l.dealValue ? parseFloat(l.dealValue) : 0), 0);

  if (!isLoaded) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>;
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FollowPilot AI</h1>
          <p className="text-sm text-gray-500">
            Premium sales workspace for freelancers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense
            fallback={
              <div className="h-9 w-20 animate-pulse bg-gray-100 rounded-md" />
            }
          >
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </Suspense>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Open Pipeline</h2>
          <p className="text-4xl font-bold text-emerald-600">
            ${openValue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Across {totalActive} active leads
          </p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Follow-ups Due</h2>
          <p className="text-4xl font-bold text-emerald-600">
            {(statusCounts.REPLIED || 0) + (statusCounts.PROPOSAL || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Leads needing attention</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Leads</h2>
        {loading && (
          <span className="text-sm text-gray-500 animate-pulse">Loading…</span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 bg-white border border-gray-200 rounded-lg animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No leads yet. Create one via the API or seed the database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onRecommend={handleRecommend} />
          ))}
        </div>
      )}

      {openRec && (
        <RecommendationModal
          recommendation={openRec.rec}
          leadName={openRec.leadName}
          onClose={() => setOpenRec(null)}
          onApprove={handleApprove}
        />
      )}
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-500">Loading…</div>}
    >
      <DashboardContent />
    </Suspense>
  );
}
