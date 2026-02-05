"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPlatformAnalytics, PlatformAnalytics, checkCurrentUserIsSuperAdmin } from "@/app/actions/super-admin";
import { Loader2, Building2, Users, TrendingUp, Package, Shield, AlertCircle } from "lucide-react";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Check if user is super admin
        const isSuper = await checkCurrentUserIsSuperAdmin();
        if (!isSuper) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);

        // Load analytics
        const data = await getPlatformAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error("Error loading super admin dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-500">Se încarcă...</p>
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
            Această pagină este disponibilă doar pentru Super Administratori.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:shadow-lg transition-all"
          >
            Înapoi la Acasă
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
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-teal-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Panou Super Administrator
              </h1>
            </div>
            <p className="text-gray-600">
              Vedere generală a platformei
            </p>
          </div>
          <button
            onClick={() => router.push("/super-admin/companies")}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:shadow-lg transition-all"
          >
            Gestionare Companii
          </button>
        </div>

        {analytics && (
          <>
            {/* Platform Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={<Building2 className="w-6 h-6" />}
                title="Total Companii"
                value={analytics.totalCompanies}
                subtitle={`${analytics.activeCompanies} active`}
                color="blue"
                onClick={() => router.push("/super-admin/companies")}
              />
              <StatCard
                icon={<Users className="w-6 h-6" />}
                title="Total Utilizatori"
                value={analytics.totalUsers}
                subtitle="Pe platformă"
                color="green"
              />
              <StatCard
                icon={<Package className="w-6 h-6" />}
                title="Total Cheltuieli"
                value={analytics.totalExpenses}
                subtitle={formatCurrency(analytics.totalExpensesAmount)}
                color="teal"
              />
              <StatCard
                icon={<AlertCircle className="w-6 h-6" />}
                title="Companii Pendinte"
                value={analytics.pendingCompanies}
                subtitle="Așteaptă activare"
                color="yellow"
                onClick={() => router.push("/super-admin/companies?filter=pending")}
              />
            </div>

            {/* Company Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatusCard
                title="Companii Active"
                count={analytics.activeCompanies}
                percentage={((analytics.activeCompanies / analytics.totalCompanies) * 100).toFixed(1)}
                color="green"
              />
              <StatusCard
                title="Companii în Așteptare"
                count={analytics.pendingCompanies}
                percentage={((analytics.pendingCompanies / analytics.totalCompanies) * 100).toFixed(1)}
                color="yellow"
              />
              <StatusCard
                title="Companii Suspendate"
                count={analytics.suspendedCompanies}
                percentage={((analytics.suspendedCompanies / analytics.totalCompanies) * 100).toFixed(1)}
                color="red"
              />
            </div>

            {/* Recent Companies */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Companii Adăugate Recent
                </h2>
                <button
                  onClick={() => router.push("/super-admin/companies")}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Vezi Toate →
                </button>
              </div>

              {analytics.recentCompanies.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentCompanies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/super-admin/companies/${company.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {company.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Adăugat: {new Date(company.created_at).toLocaleDateString("ro-RO")}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                          company.status === "active"
                            ? "bg-green-100 text-green-700"
                            : company.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {company.status === "active" ? "Activ" : company.status === "pending" ? "Pending" : "Suspendat"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nu există companii recente
                </p>
              )}
            </div>
          </>
        )}
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
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    red: "from-red-500 to-red-600",
    teal: "from-teal-500 to-teal-600",
  };

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm p-6 ${onClick ? "hover:shadow-md transition-all cursor-pointer" : ""}`}
    >
      <div
        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
          colorClasses[color as keyof typeof colorClasses]
        } flex items-center justify-center text-white mb-4`}
      >
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </Component>
  );
}

function StatusCard({
  title,
  count,
  percentage,
  color,
}: {
  title: string;
  count: number;
  percentage: string;
  color: string;
}) {
  const colorClasses = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-sm font-medium text-gray-600 mb-3">{title}</h3>
      <div className="flex items-baseline gap-3 mb-3">
        <p className="text-3xl font-bold text-gray-900">{count}</p>
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            colorClasses[color as keyof typeof colorClasses]
          }`}
        >
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            color === "green"
              ? "bg-green-500"
              : color === "yellow"
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " Lei";
}
