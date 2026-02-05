"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCompanyInfo, getCompanyStats, CompanyInfo, CompanyStats } from "@/app/actions/company-settings";
import { getRecentAuditActivity, AuditLogEntry } from "@/app/actions/audit";
import { canViewCompanyDashboard } from "@/app/actions/permissions";
import { Loader2, Building2, Users, TrendingUp, AlertCircle, Settings, Shield } from "lucide-react";

export default function CompanyDashboardPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Check authorization
        const canView = await canViewCompanyDashboard(params.teamId);
        if (!canView) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);

        // Load company data in parallel
        const [info, statsData, activity] = await Promise.all([
          getCompanyInfo(params.teamId),
          getCompanyStats(params.teamId),
          getRecentAuditActivity(params.teamId),
        ]);

        setCompanyInfo(info);
        setStats(statsData);
        setRecentActivity(activity);
      } catch (error) {
        console.error("Error loading company dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-500">Se încarcă panoul...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acces Restricționat
          </h2>
          <p className="text-gray-600 mb-6">
            Nu aveți permisiunea de a accesa acest panou. Doar administratorii companiei pot vedea această secțiune.
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Panou Companie
            </h1>
            <p className="text-gray-600">
              Gestionați compania și echipa
            </p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/${params.teamId}/company/settings`)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:shadow-lg transition-all"
          >
            <Settings className="w-5 h-5" />
            Setări Companie
          </button>
        </div>

        {/* Company Info Card */}
        {companyInfo && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {companyInfo.name}
                </h2>
                <p className="text-gray-600 mb-4">
                  Administrator: {companyInfo.admin_name || companyInfo.admin_email}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Email</span>
                    <p className="font-medium text-gray-900">{companyInfo.admin_email}</p>
                  </div>
                  {companyInfo.admin_phone && (
                    <div>
                      <span className="text-sm text-gray-500">Telefon</span>
                      <p className="font-medium text-gray-900">{companyInfo.admin_phone}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-500">Status</span>
                    <p className="font-medium">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                          companyInfo.status === "active"
                            ? "bg-green-100 text-green-700"
                            : companyInfo.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {companyInfo.status === "active" ? "Activ" : companyInfo.status === "pending" ? "În așteptare" : "Suspendat"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Users className="w-6 h-6" />}
              title="Utilizatori Totali"
              value={stats.totalUsers}
              subtitle={`${stats.activeUsers} activi`}
              color="blue"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Cheltuieli Totale"
              value={stats.totalExpenses}
              subtitle={formatCurrency(stats.totalExpensesAmount)}
              color="green"
            />
            <StatCard
              icon={<AlertCircle className="w-6 h-6" />}
              title="Invitații Pendinte"
              value={stats.pendingInvites}
              subtitle="În așteptare"
              color="yellow"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Buget Utilizat"
              value={`${stats.budgetUsed.toFixed(1)}%`}
              subtitle={`Rămâne ${formatCurrency(stats.budgetRemaining)}`}
              color={stats.budgetUsed > 90 ? "red" : stats.budgetUsed > 75 ? "yellow" : "teal"}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <QuickActionCard
            title="Gestionare Utilizatori"
            description="Invitați, eliminați sau schimbați rolurile utilizatorilor"
            icon={<Users className="w-8 h-8" />}
            onClick={() => router.push(`/dashboard/${params.teamId}/admin/whitelist`)}
          />
          <QuickActionCard
            title="Roluri & Permisiuni"
            description="Configurați rolurile și permisiunile echipei"
            icon={<Shield className="w-8 h-8" />}
            onClick={() => router.push(`/dashboard/${params.teamId}/company/roles`)}
          />
          <QuickActionCard
            title="Setări Companie"
            description="Actualizați informațiile companiei și bugetul"
            icon={<Settings className="w-8 h-8" />}
            onClick={() => router.push(`/dashboard/${params.teamId}/company/settings`)}
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Activitate Recentă
          </h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{entry.user_name || entry.user_email}</span>{" "}
                      {getActionLabel(entry.action)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleString("ro-RO")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Nu există activitate recentă
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    red: "from-red-500 to-red-600",
    teal: "from-teal-500 to-teal-600",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-all group"
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " Lei";
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    "company.created": "a creat compania",
    "company.updated": "a actualizat compania",
    "user.invited": "a invitat un utilizator",
    "user.added": "a adăugat un utilizator",
    "user.removed": "a eliminat un utilizator",
    "user.role_changed": "a schimbat rolul unui utilizator",
    "budget.updated": "a actualizat bugetul",
    "settings.updated": "a actualizat setările",
  };
  return labels[action] || action;
}
