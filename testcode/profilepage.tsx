import { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';

interface ProfilePageProps {
  onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nume: 'Andrei Popescu',
    email: 'andrei.popescu@example.com',
    companie: 'SC BONO SRL',
    parola: 'password123'
  });

  const handleSave = () => {
    // Handle save logic here
    console.log('Saving profile:', formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 p-6">
      {/* Profile Card */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-200/30 p-8 relative">
          {/* Close button - top left inside card */}
          <button
            onClick={onBack}
            className="absolute top-6 left-6 p-2 bg-white/70 backdrop-blur-xl rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] border border-gray-200/50 transition-all hover:bg-gray-100/70 z-10"
          >
            <X size={20} className="text-gray-600" />
          </button>

          {/* Title */}
          <h1 className="text-gray-900 mb-10 text-center" style={{ fontSize: '1.875rem', fontWeight: 600 }}>
            Profil
          </h1>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Nume */}
            <div className="flex items-center gap-6">
              <label className="text-gray-700 w-40 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Nume complet
              </label>
              <input
                type="text"
                value={formData.nume}
                onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                className="flex-1 px-6 py-4 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-2xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                style={{ fontSize: '0.9375rem', fontWeight: 400 }}
              />
            </div>

            {/* Email */}
            <div className="flex items-center gap-6">
              <label className="text-gray-700 w-40 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="flex-1 px-6 py-4 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-2xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                style={{ fontSize: '0.9375rem', fontWeight: 400 }}
              />
            </div>

            {/* Companie */}
            <div className="flex items-center gap-6">
              <label className="text-gray-700 w-40 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Companie
              </label>
              <input
                type="text"
                value={formData.companie}
                onChange={(e) => setFormData({ ...formData, companie: e.target.value })}
                className="flex-1 px-6 py-4 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-2xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                style={{ fontSize: '0.9375rem', fontWeight: 400 }}
              />
            </div>

            {/* Parola */}
            <div className="flex items-center gap-6">
              <label className="text-gray-700 w-40 flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Parola
              </label>
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.parola}
                  onChange={(e) => setFormData({ ...formData, parola: e.target.value })}
                  className="w-full px-6 py-4 pr-14 border border-gray-300/50 bg-white/70 backdrop-blur-xl rounded-2xl text-gray-900 focus:outline-none focus:border-gray-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  style={{ fontSize: '0.9375rem', fontWeight: 400 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end mt-10">
            <button
              onClick={onBack}
              className="px-8 py-3 border border-gray-300/50 bg-white/70 backdrop-blur-xl text-gray-700 rounded-full transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500 }}
            >
              Anuleaza
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500 }}
            >
              Salveaza
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}