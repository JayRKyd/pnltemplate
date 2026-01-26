"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useStackApp } from '@stackframe/stack';
import { 
  Building2, 
  Check, 
  Loader2,
  AlertCircle,
  LogIn,
  Mail
} from 'lucide-react';
import { acceptCompanyInvitation, Company } from '@/app/actions/companies';
import { supabase } from '@/lib/supabase';

export default function AcceptCompanyInvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const stackApp = useStackApp();
  const user = useUser();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        // Fetch company details using the token
        const { data, error: fetchError } = await supabase
          .from('companies')
          .select('*')
          .eq('invitation_token', params.token)
          .single();

        if (fetchError || !data) {
          setError('Invitația nu a fost găsită sau a expirat.');
          setLoading(false);
          return;
        }

        if (data.status === 'active') {
          setError('Această invitație a fost deja acceptată.');
          setLoading(false);
          return;
        }

        setCompany(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching invitation:', err);
        setError('A apărut o eroare. Vă rugăm să încercați din nou.');
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [params.token]);

  const handleSignIn = () => {
    // Redirect to sign in with callback to return here
    const callbackUrl = `/invite/company/${params.token}`;
    window.location.href = `/handler/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const handleSignUp = () => {
    // Redirect to sign up with callback to return here
    const callbackUrl = `/invite/company/${params.token}`;
    window.location.href = `/handler/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const handleAccept = async () => {
    if (!user) {
      handleSignIn();
      return;
    }

    setAccepting(true);
    try {
      const result = await acceptCompanyInvitation(params.token);
      
      if (result.success) {
        setSuccess(true);
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push(`/dashboard/${result.company?.team_id || ''}`);
        }, 2000);
      } else {
        setError(result.error || 'Nu s-a putut accepta invitația.');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('A apărut o eroare. Vă rugăm să încercați din nou.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
            <Loader2 size={32} className="text-teal-600 animate-spin" />
          </div>
          <p className="text-gray-500">Se încarcă invitația...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Invitație invalidă
          </h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-all"
          >
            Înapoi la pagina principală
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Bun venit! 🎉
          </h1>
          <p className="text-gray-500 mb-4">
            Ai acceptat cu succes invitația pentru <strong>{company?.name}</strong>.
          </p>
          <p className="text-sm text-gray-400">
            Vei fi redirecționat în câteva secunde...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-10 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Invitație pentru {company?.name}
          </h1>
          <p className="text-white/80 text-sm">
            Ai fost invitat să administrezi această companie
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Company Info */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-teal-600">
                  {company?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{company?.name}</h3>
                <p className="text-sm text-gray-500">
                  Rol: {company?.admin_role === 'admin' ? 'Administrator' : company?.admin_role}
                </p>
              </div>
            </div>
          </div>

          {/* Invitation Details */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-gray-400" />
              <span className="text-gray-600">
                Invitația este pentru: <strong>{company?.admin_email}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {user ? (
            // User is logged in
            user.primaryEmail === company?.admin_email ? (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accepting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Check size={20} />
                )}
                {accepting ? 'Se procesează...' : 'Acceptă invitația'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  <p>
                    Ești autentificat ca <strong>{user.primaryEmail}</strong>, dar invitația este pentru <strong>{company?.admin_email}</strong>.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await user.signOut();
                    handleSignIn();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-all"
                >
                  <LogIn size={18} />
                  Schimbă contul
                </button>
              </div>
            )
          ) : (
            // User is not logged in
            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg"
              >
                <LogIn size={18} />
                Autentifică-te pentru a accepta
              </button>
              <p className="text-center text-sm text-gray-500">
                Nu ai cont?{' '}
                <button 
                  onClick={handleSignUp}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  Creează unul acum
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
