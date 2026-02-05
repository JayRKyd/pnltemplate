"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTeamMembers, updateMemberRole, TeamMemberWithProfile } from "@/app/actions/team-members";
import { getAvailableRoles } from "@/app/actions/permissions";
import { logCompanyAudit } from "@/app/actions/audit";
import { canManageUsers } from "@/app/actions/permissions";
import { Loader2, Shield, ArrowLeft, Edit2, Check, X } from "lucide-react";

export default function RoleManagementPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [roles, setRoles] = useState<{ value: string; label: string; description: string }[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Check authorization
        const canManage = await canManageUsers(params.teamId);
        if (!canManage) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);

        // Load data in parallel
        const [membersData, rolesData] = await Promise.all([
          getTeamMembers(params.teamId),
          getAvailableRoles(),
        ]);

        setMembers(membersData);
        setRoles(rolesData);
      } catch (error) {
        console.error("Error loading role management:", error);
        setError("Eroare la încărcarea datelor");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.teamId]);

  const handleStartEdit = (userId: string, currentRole: string) => {
    setEditingUserId(userId);
    setSelectedRole(currentRole);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setSelectedRole("");
    setError(null);
  };

  const handleSaveRole = async (userId: string, userName: string | null, userEmail: string | null) => {
    if (!selectedRole) return;

    setUpdating(true);
    setError(null);

    try {
      await updateMemberRole(params.teamId, userId, selectedRole);

      // Log audit
      await logCompanyAudit({
        teamId: params.teamId,
        action: "user.role_changed",
        entityType: "user",
        entityId: userId,
        details: {
          user_name: userName,
          user_email: userEmail,
          new_role: selectedRole,
        },
      });

      // Refresh members list
      const updatedMembers = await getTeamMembers(params.teamId);
      setMembers(updatedMembers);

      setEditingUserId(null);
      setSelectedRole("");
    } catch (err: any) {
      console.error("Error updating role:", err);
      setError(err.message || "Eroare la actualizarea rolului");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-500">Se încarcă rolurile...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acces Restricționat
          </h2>
          <p className="text-gray-600 mb-6">
            Nu aveți permisiunea de a gestiona rolurile utilizatorilor.
          </p>
          <button
            onClick={() => router.push(`/dashboard/${params.teamId}/expenses`)}
            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:shadow-lg transition-all"
          >
            Înapoi la Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard/${params.teamId}/company`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi la Panou
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Gestionare Roluri
              </h1>
              <p className="text-gray-600">
                Schimbați rolurile utilizatorilor din echipă
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Role Descriptions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Descriere Roluri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.value} className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-1">{role.label}</h3>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Membri Echipă ({members.length})
            </h2>
          </div>

          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilizator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acțiuni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                            {(member.name || member.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.name || "Nume Nedefinit"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(member.joined_at).toLocaleDateString("ro-RO")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.email || "Email nedefinit"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUserId === member.user_id ? (
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            disabled={updating}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                          >
                            {roles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                            {roles.find((r) => r.value === member.role)?.label || member.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                            member.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {member.is_active ? "Activ" : "Inactiv"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {editingUserId === member.user_id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveRole(member.user_id, member.name, member.email)}
                              disabled={updating}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {updating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Check className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={updating}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(member.user_id, member.role)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              Nu există membri în echipă
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
