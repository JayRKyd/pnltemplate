"use client";

import React, { useState } from 'react';
import { useUser } from "@stackframe/stack";
import { useTheme } from "next-themes";
import { 
  Settings, 
  Sun, 
  Moon, 
  LogOut, 
  Users,
} from 'lucide-react';
import { Utilizatori } from '@/testcode/utilizatori';

interface UserDropdownProps {
  colorModeToggle?: () => void;
}

export function UserDropdown({ colorModeToggle }: UserDropdownProps) {
  const user = useUser({ or: 'redirect' });
  const { resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showUtilizatori, setShowUtilizatori] = useState(false);

  const handleThemeToggle = () => {
    if (colorModeToggle) {
      colorModeToggle();
    } else {
      setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
    }
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await user.signOut();
    setIsOpen(false);
  };

  const handleAccountSettings = () => {
    window.location.href = '/handler/account-settings';
    setIsOpen(false);
  };

  const handleTeamMembers = () => {
    setShowUtilizatori(true);
    setIsOpen(false);
  };

  // Get initials for avatar
  const getInitials = () => {
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user.primaryEmail) {
      return user.primaryEmail.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    return user.displayName || 'User';
  };

  // Get email
  const getEmail = () => {
    return user.primaryEmail || '';
  };

  return (
    <>
      <div className="relative">
        {/* Avatar Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
            {getInitials()}
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                    {getInitials()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getDisplayName()}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                      {getEmail()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={handleAccountSettings}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings size={18} className="text-gray-400" />
                  Account settings
                </button>

                <button
                  onClick={handleTeamMembers}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Users size={18} className="text-gray-400" />
                  Team Members
                </button>

                <button
                  onClick={handleThemeToggle}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {resolvedTheme === 'light' ? (
                    <Moon size={18} className="text-gray-400" />
                  ) : (
                    <Sun size={18} className="text-gray-400" />
                  )}
                  Toggle theme
                </button>
              </div>

              {/* Sign Out */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <LogOut size={18} className="text-gray-400" />
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Utilizatori Modal */}
      {showUtilizatori && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUtilizatori(false)}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 max-h-[90vh] overflow-auto">
            <Utilizatori onClose={() => setShowUtilizatori(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export default UserDropdown;
