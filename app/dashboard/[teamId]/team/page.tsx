"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@stackframe/stack";
import {
  getTeamMembers,
  updateMemberRole,
  removeTeamMember,
  createTeamInvite,
  getTeamInvites,
  cancelTeamInvite,
  TeamMemberWithProfile,
  TeamInvite,
} from "@/app/actions/team-members";
import { UserPlus, Trash2, Shield, User, Crown, Mail, X, Clock } from "lucide-react";

const ROLES = [
  { value: "owner", label: "Owner", icon: Crown },
  { value: "admin", label: "Admin", icon: Shield },
  { value: "member", label: "Member", icon: User },
];

export default function TeamMembersPage() {
  const params = useParams<{ teamId: string }>();
  const user = useUser({ or: "redirect" });
  const team = user.useTeam(params.teamId);

  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (params.teamId) {
      loadData();
    }
  }, [params.teamId]);

  async function loadData() {
    try {
      setLoading(true);
      const [membersData, invitesData] = await Promise.all([
        getTeamMembers(params.teamId),
        getTeamInvites(params.teamId),
      ]);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      await createTeamInvite(params.teamId, inviteEmail.trim(), inviteRole);
      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      // Reload invites
      const newInvites = await getTeamInvites(params.teamId);
      setInvites(newInvites);
    } catch (err: any) {
      console.error("Failed to invite:", err);
      setError(err.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      await cancelTeamInvite(inviteId, params.teamId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      console.error("Failed to cancel invite:", err);
      setError("Failed to cancel invite");
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await updateMemberRole(params.teamId, userId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      console.error("Failed to update role:", err);
      setError("Failed to update role");
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await removeTeamMember(params.teamId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err) {
      console.error("Failed to remove member:", err);
      setError("Failed to remove member");
    }
  }

  if (!team) {
    return <div className="p-8">Team not found</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Team Members</h2>
        <p className="text-sm text-muted-foreground">
          Manage members of {team.displayName}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Invite Form */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <UserPlus size={18} />
          Invite New Member
        </h3>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} />
            Pending Invites ({invites.length})
          </h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-yellow-600" />
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Role: {invite.role} • Sent{" "}
                      {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                  title="Cancel invite"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4">
        <h3 className="font-semibold mb-4">Current Members</h3>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No members synced yet. Members will appear after they sign in.
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User size={20} className="text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {member.name || "Unknown"}
                      {member.user_id === user.id && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.user_id, e.target.value)
                    }
                    disabled={member.user_id === user.id}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>

                  {member.user_id !== user.id && (
                    <button
                      onClick={() => handleRemove(member.user_id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                      title="Remove member"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
