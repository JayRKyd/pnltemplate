"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Check,
  User,
  Mail,
  UserPlus,
  Trash2,
  RefreshCcw,
  Ban,
  Clock,
  Shield,
  Key,
  Smartphone,
  ChevronDown,
  Send,
  MoreVertical,
} from "lucide-react";
import {
  getWhitelistedUsers,
  addToWhitelist,
  updateWhitelistedUser,
  deactivateWhitelistedUser,
  reactivateWhitelistedUser,
  removeFromWhitelist,
  resendInvitation,
  WhitelistedUser,
  AddToWhitelistInput,
} from "@/app/actions/whitelist";

const ROLES = [
  { value: "owner", label: "Admin", description: "Full access to all features" },
  { value: "admin", label: "Editor", description: "Can edit and manage expenses" },
  { value: "member", label: "Viewer", description: "Read-only access" },
];

const AUTH_METHODS = [
  { value: "password", label: "Parolă", icon: Key },
  { value: "google", label: "Google Login", icon: Shield },
  { value: "magic_link", label: "Magic Link", icon: Mail },
];

interface WhitelistManagementProps {
  teamId: string;
  onClose?: () => void;
}

interface AddUserModalProps {
  onClose: () => void;
  onSubmit: (data: AddToWhitelistInput) => Promise<void>;
  loading: boolean;
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText: string;
  confirmColor?: "red" | "teal";
  icon: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

function ConfirmModal({
  title,
  message,
  confirmText,
  confirmColor = "red",
  icon,
  onClose,
  onConfirm,
  loading,
}: ConfirmModalProps) {
  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 w-[420px] shadow-xl flex flex-col items-center text-center relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute left-6 top-6 p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>

        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mt-4 ${
            confirmColor === "red" ? "bg-red-50" : "bg-teal-50"
          }`}
        >
          {icon}
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>

        <p className="text-gray-500 text-sm leading-relaxed mb-8">{message}</p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Anulează
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-white rounded-full font-medium transition-colors shadow-sm disabled:opacity-50 ${
              confirmColor === "red"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-teal-500 hover:bg-teal-600"
            }`}
          >
            {loading ? "Se procesează..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onSubmit, loading }: AddUserModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("member");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [authMethods, setAuthMethods] = useState<string[]>(["password", "google", "magic_link"]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const toggleAuthMethod = (method: string) => {
    setAuthMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    await onSubmit({
      email: email.trim(),
      fullName: fullName.trim(),
      role,
      authMethods,
      twoFactorEnabled,
    });
  };

  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 w-[500px] shadow-xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>

        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-6 mx-auto">
          <UserPlus size={32} className="text-teal-500" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          Adaugă utilizator
        </h3>

        <p className="text-gray-500 text-sm text-center mb-6">
          Introdu detaliile utilizatorului pentru a-l adăuga în whitelist.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@companie.ro"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              required
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nume complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ion Popescu"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-700 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <span className="font-medium">
                    {ROLES.find((r) => r.value === role)?.label}
                  </span>
                  <span className="text-gray-400 text-sm ml-2">
                    - {ROLES.find((r) => r.value === role)?.description}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    showRoleDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showRoleDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowRoleDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => {
                          setRole(r.value);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          role === r.value ? "text-teal-600 bg-teal-50" : "text-gray-700"
                        }`}
                      >
                        <div className="font-medium">{r.label}</div>
                        <div className="text-sm text-gray-400">{r.description}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Auth Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Metode de autentificare
            </label>
            <div className="space-y-2">
              {AUTH_METHODS.map((method) => (
                <label
                  key={method.value}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={authMethods.includes(method.value)}
                    onChange={() => toggleAuthMethod(method.value)}
                    className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <method.icon size={18} className="text-gray-400" />
                  <span className="text-sm text-gray-700">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 2FA Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Autentificare în 2 pași (2FA)
                </div>
                <div className="text-xs text-gray-400">
                  Solicită cod suplimentar la autentificare
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                twoFactorEnabled ? "bg-teal-500" : "bg-gray-200"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  twoFactorEnabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim() || !fullName.trim() || authMethods.length === 0}
              className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-full font-medium hover:bg-teal-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                "Se adaugă..."
              ) : (
                <>
                  <Send size={16} />
                  Adaugă și trimite invitație
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WhitelistManagement({ teamId, onClose }: WhitelistManagementProps) {
  const [activeTab, setActiveTab] = useState<"activi" | "pending" | "inactivi">("activi");
  const [users, setUsers] = useState<WhitelistedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "deactivate" | "reactivate" | "remove" | "resend";
    user: WhitelistedUser;
  } | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWhitelistedUsers(teamId);
      setUsers(data);
    } catch (err) {
      console.error("Failed to load whitelist:", err);
      setError("Nu s-a putut încărca lista de utilizatori");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((user) => {
    if (activeTab === "activi") return user.status === "active" || user.status === "accepted";
    if (activeTab === "pending") return user.status === "pending";
    if (activeTab === "inactivi") return user.status === "deactivated";
    return true;
  });

  const handleAddUser = async (data: AddToWhitelistInput) => {
    setActionLoading(true);
    setError(null);

    try {
      await addToWhitelist(teamId, data);
      setSuccess(`Utilizatorul ${data.fullName} a fost adăugat în whitelist`);
      setShowAddModal(false);
      await loadUsers();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Nu s-a putut adăuga utilizatorul";
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    try {
      switch (confirmAction.type) {
        case "deactivate":
          await deactivateWhitelistedUser(confirmAction.user.id, teamId);
          setSuccess("Utilizatorul a fost dezactivat");
          break;
        case "reactivate":
          await reactivateWhitelistedUser(confirmAction.user.id, teamId);
          setSuccess("Utilizatorul a fost reactivat");
          break;
        case "remove":
          await removeFromWhitelist(confirmAction.user.id, teamId);
          setSuccess("Utilizatorul a fost șters din whitelist");
          break;
        case "resend":
          await resendInvitation(confirmAction.user.id, teamId);
          setSuccess("Invitația a fost retrimisă");
          break;
      }
      setConfirmAction(null);
      await loadUsers();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Acțiunea a eșuat";
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            Activ
          </span>
        );
      case "accepted":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            Acceptat
          </span>
        );
      case "pending":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
            În așteptare
          </span>
        );
      case "deactivated":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            Dezactivat
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      owner: { bg: "#F3E8FFB2", text: "#374151" },
      admin: { bg: "#DBEAFEB2", text: "#374151" },
      member: { bg: "#F3F4F6", text: "#374151" },
    };
    const style = styles[role] || styles.member;
    const label = ROLES.find((r) => r.value === role)?.label || role;

    return (
      <span
        className="px-3 py-1 rounded-full text-xs font-medium border border-gray-200"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {label}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const months = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const counts = {
    activi: users.filter((u) => u.status === "active" || u.status === "accepted").length,
    pending: users.filter((u) => u.status === "pending").length,
    inactivi: users.filter((u) => u.status === "deactivated").length,
  };

  return (
    <div className="bg-white rounded-[24px] shadow-lg border border-gray-100 overflow-hidden font-sans w-full max-w-[1000px] mx-auto relative min-h-[650px]">
      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddUser}
          loading={actionLoading}
        />
      )}

      {confirmAction?.type === "deactivate" && (
        <ConfirmModal
          title="Dezactivează utilizator?"
          message={`Ești sigur că vrei să dezactivezi pe ${confirmAction.user.full_name}? Utilizatorul nu va mai putea accesa platforma.`}
          confirmText="Dezactivează"
          confirmColor="red"
          icon={<Ban size={32} className="text-red-500" />}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          loading={actionLoading}
        />
      )}

      {confirmAction?.type === "reactivate" && (
        <ConfirmModal
          title="Reactivează utilizator?"
          message={`Ești sigur că vrei să reactivezi pe ${confirmAction.user.full_name}?`}
          confirmText="Reactivează"
          confirmColor="teal"
          icon={<RefreshCcw size={32} className="text-teal-500" />}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          loading={actionLoading}
        />
      )}

      {confirmAction?.type === "remove" && (
        <ConfirmModal
          title="Șterge utilizator?"
          message={`Ești sigur că vrei să ștergi pe ${confirmAction.user.full_name} din whitelist? Această acțiune nu poate fi anulată.`}
          confirmText="Șterge definitiv"
          confirmColor="red"
          icon={<Trash2 size={32} className="text-red-500" />}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          loading={actionLoading}
        />
      )}

      {confirmAction?.type === "resend" && (
        <ConfirmModal
          title="Retrimite invitația?"
          message={`Se va genera un nou link de invitație pentru ${confirmAction.user.full_name} și se va trimite pe email.`}
          confirmText="Retrimite"
          confirmColor="teal"
          icon={<Send size={32} className="text-teal-500" />}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          loading={actionLoading}
        />
      )}

      {/* Success/Error Toast */}
      {(success || error) && (
        <div
          className={`absolute top-4 right-4 left-4 md:left-auto md:w-96 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 ${
            success
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <span className="text-sm flex-1">{success || error}</span>
          <button
            onClick={() => {
              setSuccess(null);
              setError(null);
            }}
            className="hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Whitelist Utilizatori</h1>
            <p className="text-sm text-gray-500">Gestionează accesul utilizatorilor la platformă</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab("activi")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "activi"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {activeTab === "activi" && <Check size={16} />}
            Activi ({counts.activi})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "pending"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {activeTab === "pending" && <Check size={16} />}
            În așteptare ({counts.pending})
          </button>
          <button
            onClick={() => setActiveTab("inactivi")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "inactivi"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {activeTab === "inactivi" && <Check size={16} />}
            Inactivi ({counts.inactivi})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-4">
        {loading ? (
          <div className="py-16 text-center text-gray-500">Se încarcă...</div>
        ) : (
          <>
            {/* Table Header */}
            <div
              className="grid grid-cols-[1.2fr_1.5fr_100px_100px_120px_80px] gap-4 py-3 border-y border-gray-100 rounded-t-lg"
              style={{ backgroundColor: "#F9FAFBB2" }}
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-4">
                Utilizator
              </div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Email
              </div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                Rol
              </div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                Status
              </div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                Data
              </div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                Acțiuni
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  {activeTab === "activi" && "Nu există utilizatori activi."}
                  {activeTab === "pending" && "Nu există invitații în așteptare."}
                  {activeTab === "inactivi" && "Nu există utilizatori dezactivați."}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1.2fr_1.5fr_100px_100px_120px_80px] gap-4 py-4 items-center hover:bg-gray-50/50 transition-colors pl-4"
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                        <User size={20} className="text-teal-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {user.full_name}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="text-sm text-gray-500 truncate">{user.email}</div>

                    {/* Role */}
                    <div className="flex justify-center">{getRoleBadge(user.role)}</div>

                    {/* Status */}
                    <div className="flex justify-center">{getStatusBadge(user.status)}</div>

                    {/* Date */}
                    <div className="text-sm text-gray-500 text-center">
                      {user.status === "pending"
                        ? formatDate(user.invitation_sent_at || user.created_at)
                        : formatDate(user.last_login_at || user.accepted_at)}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>

                      {openMenuId === user.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                            {user.status === "pending" && (
                              <button
                                onClick={() => {
                                  setConfirmAction({ type: "resend", user });
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Send size={14} />
                                Retrimite invitația
                              </button>
                            )}
                            {(user.status === "active" || user.status === "accepted") && (
                              <button
                                onClick={() => {
                                  setConfirmAction({ type: "deactivate", user });
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Ban size={14} />
                                Dezactivează
                              </button>
                            )}
                            {user.status === "deactivated" && (
                              <button
                                onClick={() => {
                                  setConfirmAction({ type: "reactivate", user });
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <RefreshCcw size={14} />
                                Reactivează
                              </button>
                            )}
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={() => {
                                setConfirmAction({ type: "remove", user });
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Șterge definitiv
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 flex justify-center border-t border-gray-100">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-full transition-colors shadow-sm flex items-center gap-2"
        >
          <UserPlus size={18} />
          Adaugă utilizator
        </button>
      </div>
    </div>
  );
}

export default WhitelistManagement;
