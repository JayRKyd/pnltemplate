"use client";

import React from "react";
import { ShieldX, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showContactAdmin?: boolean;
  adminEmail?: string;
}

export function AccessDenied({
  title = "Acces restricționat",
  message = "Nu ai permisiunea de a accesa această resursă.",
  showContactAdmin = true,
  adminEmail,
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-md w-full text-center">
        {/* Shield Icon */}
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShieldX size={48} className="text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>

        {/* Message */}
        <p className="text-gray-500 mb-8 leading-relaxed">{message}</p>

        {/* Contact Admin */}
        {showContactAdmin && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-8">
            <p className="text-sm text-gray-600 mb-3">
              Dacă crezi că ar trebui să ai acces, contactează administratorul:
            </p>
            {adminEmail ? (
              <a
                href={`mailto:${adminEmail}`}
                className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
              >
                <Mail size={16} />
                {adminEmail}
              </a>
            ) : (
              <span className="text-gray-500 text-sm">
                Solicită administratorului să te adauge în whitelist.
              </span>
            )}
          </div>
        )}

        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          Înapoi la pagina principală
        </Link>
      </div>
    </div>
  );
}

export function WhitelistRequiredNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
      <div className="flex items-start gap-3">
        <ShieldX size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium mb-1">Înregistrare restricționată</p>
          <p className="text-sm text-amber-700">
            Înregistrările sunt disponibile doar pentru utilizatorii invitați. Dacă ai primit o invitație,
            folosește link-ul din email pentru a-ți crea contul.
          </p>
        </div>
      </div>
    </div>
  );
}
