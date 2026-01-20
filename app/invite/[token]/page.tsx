"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, X, Loader2, Shield, Mail, Key, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InviteData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team_id: string;
  auth_methods: string[];
  two_factor_enabled: boolean;
  status: string;
  invitation_expires_at: string;
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);

  useEffect(() => {
    async function validateInvite() {
      try {
        const { data, error: fetchError } = await supabase
          .from("user_whitelist")
          .select("*")
          .eq("invitation_token", params.token)
          .single();

        if (fetchError || !data) {
          setError("Invitația nu a fost găsită sau este invalidă.");
          return;
        }

        // Check if expired
        if (data.invitation_expires_at && new Date(data.invitation_expires_at) < new Date()) {
          setError("Invitația a expirat. Contactează administratorul pentru o nouă invitație.");
          return;
        }

        // Check status
        if (data.status === "deactivated") {
          setError("Contul tău a fost dezactivat. Contactează administratorul.");
          return;
        }

        if (data.status === "active") {
          // Already active, redirect to login
          router.push("/handler/sign-in");
          return;
        }

        setInvite(data);
      } catch (err) {
        console.error("Error validating invite:", err);
        setError("A apărut o eroare. Te rugăm să încerci din nou.");
      } finally {
        setLoading(false);
      }
    }

    if (params.token) {
      validateInvite();
    }
  }, [params.token, router]);

  const handleContinue = (method: string) => {
    // Store invite token in session storage for the auth flow
    sessionStorage.setItem("invite_token", params.token);
    sessionStorage.setItem("invite_email", invite?.email || "");
    sessionStorage.setItem("invite_name", invite?.full_name || "");

    switch (method) {
      case "password":
        router.push(`/handler/sign-up?email=${encodeURIComponent(invite?.email || "")}`);
        break;
      case "google":
        router.push("/handler/sign-in?provider=google");
        break;
      case "magic_link":
        router.push(`/handler/sign-in?method=magic_link&email=${encodeURIComponent(invite?.email || "")}`);
        break;
      default:
        router.push("/handler/sign-in");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full mx-4 text-center">
          <Loader2 size={48} className="animate-spin text-teal-500 mx-auto mb-6" />
          <p className="text-gray-500">Se verifică invitația...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full mx-4 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Invitație invalidă</h1>
          <p className="text-gray-500 mb-8">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors"
          >
            Înapoi la pagina principală
          </button>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-lg w-full">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-teal-500" />
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bine ai venit, {invite.full_name}!
          </h1>
          <p className="text-gray-500">
            Ai fost invitat să te alături platformei cu rolul de{" "}
            <span className="font-medium text-gray-700">
              {invite.role === "owner" ? "Admin" : invite.role === "admin" ? "Editor" : "Viewer"}
            </span>
          </p>
        </div>

        {/* Email Info */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-8 flex items-center gap-3">
          <Mail size={20} className="text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Contul va fi creat pentru:</p>
            <p className="font-medium text-gray-900">{invite.email}</p>
          </div>
        </div>

        {/* 2FA Notice */}
        {invite.two_factor_enabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
            <Shield size={20} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Autentificare în 2 pași activată</p>
              <p className="text-sm text-amber-600">
                După crearea contului, va trebui să configurezi autentificarea în 2 pași.
              </p>
            </div>
          </div>
        )}

        {/* Auth Method Options */}
        <div className="space-y-3 mb-8">
          <p className="text-sm font-medium text-gray-700 mb-3">Alege cum vrei să te autentifici:</p>

          {invite.auth_methods?.includes("password") && (
            <button
              onClick={() => handleContinue("password")}
              className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-teal-300 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                <Key size={24} className="text-gray-500 group-hover:text-teal-500" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-gray-900">Creează parolă</p>
                <p className="text-sm text-gray-500">Setează o parolă pentru contul tău</p>
              </div>
            </button>
          )}

          {invite.auth_methods?.includes("google") && (
            <button
              onClick={() => handleContinue("google")}
              className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-teal-300 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-red-50 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-gray-900">Continuă cu Google</p>
                <p className="text-sm text-gray-500">Folosește contul tău Google</p>
              </div>
            </button>
          )}

          {invite.auth_methods?.includes("magic_link") && (
            <button
              onClick={() => handleContinue("magic_link")}
              className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-teal-300 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                <Mail size={24} className="text-gray-500 group-hover:text-purple-500" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-gray-900">Magic Link</p>
                <p className="text-sm text-gray-500">Primește un link de autentificare pe email</p>
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400">
          Numele tău ({invite.full_name}) a fost predefinit și nu poate fi modificat.
        </p>
      </div>
    </div>
  );
}
