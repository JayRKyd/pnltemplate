"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Plus, Building2, X } from 'lucide-react';
import { getCompanies, CompanyWithUsers } from '@/app/actions/companies';
import { checkCurrentUserIsSuperAdmin } from '@/app/actions/super-admin';

export default function CompaniesPage() {
  const router = useRouter();
  const user = useUser({ or: 'redirect' });
  const [companies, setCompanies] = useState<CompanyWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      const isSuper = await checkCurrentUserIsSuperAdmin();
      if (!isSuper) {
        router.push('/dashboard');
        return;
      }
      setIsSuperAdmin(true);
      const data = await getCompanies();
      setCompanies(data);
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-full" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
        
        <h1 className="text-2xl font-semibold text-gray-900">Companii</h1>
        
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Card Header with Add Button */}
            <div className="flex justify-end px-6 py-5">
              <button
                onClick={() => router.push('/companies/new')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00C9A7] to-[#00D4AA] text-white rounded-full font-medium hover:opacity-90 transition-all text-sm"
              >
                <Plus size={16} />
                Adauga companie
              </button>
            </div>

            {/* Table */}
            <div className="px-6 pb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Companie
                    </th>
                    <th className="text-left py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="text-left py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-center py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Useri
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <Building2 size={24} className="text-gray-400" />
                          </div>
                          <p className="text-gray-500">Nu există companii încă</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    companies.map((company) => (
                      <tr 
                        key={company.id} 
                        className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/companies/${company.id}`)}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#00C9A7] to-[#00D4AA] rounded-full flex items-center justify-center">
                              <Building2 size={18} className="text-white" />
                            </div>
                            <span className="font-medium text-gray-900">{company.name}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-gray-700">{company.admin_name || '-'}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-gray-500">{company.admin_email}</span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 text-sm font-medium text-gray-700">
                            {company.user_count}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
