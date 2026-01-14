"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyPendingInvites, acceptTeamInvite, TeamInvite } from "@/app/actions/team-members";
import { Mail, X, Check } from "lucide-react";

export function PendingInvitesBanner() {
  const router = useRouter();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInvites();
  }, []);

  async function loadInvites() {
    try {
      const data = await getMyPendingInvites();
      setInvites(data);
    } catch (err) {
      console.error("Failed to load invites:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(invite: TeamInvite) {
    setAccepting(invite.id);
    try {
      const result = await acceptTeamInvite(invite.id);
      if (result.success) {
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        // Redirect to the team dashboard
        router.push(`/dashboard/${invite.team_id}`);
      }
    } catch (err) {
      console.error("Failed to accept invite:", err);
    } finally {
      setAccepting(null);
    }
  }

  function handleDismiss(inviteId: string) {
    setDismissed((prev) => new Set([...prev, inviteId]));
  }

  // Filter out dismissed invites
  const visibleInvites = invites.filter((i) => !dismissed.has(i.id));

  if (loading || visibleInvites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {visibleInvites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-3">
            <Mail className="text-blue-600" size={20} />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                You've been invited to join a team
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Role: {invite.role} • Invited{" "}
                {new Date(invite.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAccept(invite)}
              disabled={accepting === invite.id}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={16} />
              {accepting === invite.id ? "Joining..." : "Accept"}
            </button>
            <button
              onClick={() => handleDismiss(invite.id)}
              className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md"
              title="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
