"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { upsertCurrentUser } from "@/app/actions/upsert-user";
import { syncTeamMembership, getMyPendingInvites, acceptTeamInvite } from "@/app/actions/team-members";
import { seedDefaultCategories } from "@/app/actions/categories";

// Client wrapper to call the server action on mount with teamId.
export function UpsertUserOnMount() {
  const params = useParams<{ teamId: string }>();

  useEffect(() => {
    if (params.teamId) {
      // Sync user and team membership in parallel
      Promise.all([
        upsertCurrentUser(params.teamId),
        syncTeamMembership(params.teamId, "member"),
        seedDefaultCategories(params.teamId), // Seed categories if not exist
      ]).catch((err) => {
        console.error("Sync failed", err);
      });

      // Check and auto-accept pending invites for this team
      getMyPendingInvites()
        .then(async (invites) => {
          const teamInvite = invites.find((i) => i.team_id === params.teamId);
          if (teamInvite) {
            console.log("[UpsertUserOnMount] Auto-accepting invite:", teamInvite.id);
            await acceptTeamInvite(teamInvite.id);
          }
        })
        .catch((err) => {
          console.error("Failed to check/accept invites:", err);
        });
    }
  }, [params.teamId]);

  return null;
}
