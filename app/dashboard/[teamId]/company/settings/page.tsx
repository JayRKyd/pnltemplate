"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCompanyInfo, updateCompanyInfo, CompanyInfo } from "@/app/actions/company-settings";
import { logCompanyAudit } from "@/app/actions/audit";
import { canManageCompanySettings } from "@/app/actions/permissions";
import { Loader2, Building2, Save, ArrowLeft } from "lucide-react";

export default function CompanySettingsPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    admin_name: "",
    admin_phone: "",
    monthly_budget: 0,
    year_start_month: 1,
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Check authorization
        const canManage = await canManageCompanySettings(params.teamId);
        if (!canManage) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);

        // Load company data
        const info = await getCompanyInfo(params.teamId);
        if (info) {
          setCompanyInfo(info);
          setFormData({
            name: info.name,
            admin_name: info.admin_name || "",
            admin_phone: info.admin_phone || "",
            monthly_budget: info.monthly_budget || 0,
            year_start_month: info.year_start_month || 1,
          });
        }
      } catch (error) {
        console.error("Error loading company settings:", error);
        setError("Eroare la încărcarea setărilor");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateCompanyInfo(params.teamId, formData);

      if (result.success) {
        setSuccess(true);

        // Log audit
        await logCompanyAudit({
          teamId: params.teamId,
          action: "settings.updated",
          entityType: "company",
          entityId: companyInfo?.id || null,
          details: {
            changes: formData,
          },
        });

        // Reload data
        const info = await getCompanyInfo(params.teamId);
        if (info) {
          setCompanyInfo(info);
        }

        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Eroare la salvare");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-500">Se încarcă setările...</p>
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
            Nu aveți permisiunea de a modifica setările companiei.
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Setări Companie
              </h1>
              <p className="text-gray-600">
                Actualizați informațiile companiei
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            Setările au fost salvate cu succes!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Company Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informații Companie
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume Companie <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Ex: SC Exemplu SRL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume Administrator
                </label>
                <input
                  type="text"
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Ex: Ion Popescu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon Administrator
                </label>
                <input
                  type="tel"
                  value={formData.admin_phone}
                  onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Ex: +40 700 000 000"
                />
              </div>

              {companyInfo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Administrator
                  </label>
                  <input
                    type="email"
                    value={companyInfo.admin_email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Emailul nu poate fi modificat
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Budget Settings */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Setări Buget
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buget Lunar (Lei)
                </label>
                <input
                  type="number"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bugetul lunar pentru cheltuieli
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Luna Start An Fiscal
                </label>
                <select
                  value={formData.year_start_month}
                  onChange={(e) => setFormData({ ...formData, year_start_month: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {[
                    { value: 1, label: "Ianuarie" },
                    { value: 2, label: "Februarie" },
                    { value: 3, label: "Martie" },
                    { value: 4, label: "Aprilie" },
                    { value: 5, label: "Mai" },
                    { value: 6, label: "Iunie" },
                    { value: 7, label: "Iulie" },
                    { value: 8, label: "August" },
                    { value: 9, label: "Septembrie" },
                    { value: 10, label: "Octombrie" },
                    { value: 11, label: "Noiembrie" },
                    { value: 12, label: "Decembrie" },
                  ].map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Când începe anul fiscal al companiei
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/${params.teamId}/company`)}
              className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Se salvează...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvează Modificările
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
