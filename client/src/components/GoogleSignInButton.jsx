import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../context/authStore';
import RoleSelectionModal from './RoleSelectionModal';

export default function GoogleSignInButton({ onError, setIsLoading, navigate, text = "Continue with Google", role, onRequiresRoleSelection }) {
  const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '416610039857-2deqh9j44nksus08k2jas62cj534267c.apps.googleusercontent.com';
  const googleClientId = String(rawClientId).replace(/^["']|["']$/g, '').trim();
  const isConfigured = Boolean(
    googleClientId &&
    googleClientId.length > 10 &&
    !googleClientId.includes('dummy') &&
    googleClientId.includes('.apps.googleusercontent.com')
  );

  const [useFallback, setUseFallback] = useState(!isConfigured);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingIdToken, setPendingIdToken] = useState(null);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [roleModalLoading, setRoleModalLoading] = useState(false);

  const handleFallbackClick = () => {
    if (!isConfigured) {
      if (onError) {
        onError("Google Sign-In is not configured for this environment.");
      }
    }
  };

  const handleRoleSelected = async (selectedRole) => {
    try {
      setRoleModalLoading(true);
      if (setIsLoading) setIsLoading(true);
      const response = await useAuthStore.getState().googleLogin(pendingIdToken, selectedRole);
      const resData = response?.data || response;
      const loggedUser = resData?.user || JSON.parse(localStorage.getItem('user') || '{}');
      setShowRoleModal(false);

      if (navigate) {
        if (loggedUser?.role === 'technician') {
          navigate('/technician/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('[GoogleSignIn] Role assignment failed:', err);
      if (onError) onError(err.message || 'Failed to complete registration with chosen role.');
    } finally {
      setRoleModalLoading(false);
      if (setIsLoading) setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full flex justify-center">
        {isConfigured && !useFallback ? (
          <div className="w-full flex justify-center min-h-[44px]">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  if (setIsLoading) setIsLoading(true);
                  if (!credentialResponse?.credential) {
                    throw new Error('No credential token returned by Google Identity.');
                  }
                  const response = await useAuthStore.getState().googleLogin(credentialResponse.credential, role);
                  const resData = response?.data || response;

                  if (resData?.requiresRoleSelection || response?.requiresRoleSelection) {
                    const profile = resData?.googleProfile || response?.googleProfile;
                    if (onRequiresRoleSelection) {
                      onRequiresRoleSelection(credentialResponse.credential, profile);
                    } else {
                      setPendingIdToken(credentialResponse.credential);
                      setGoogleProfile(profile);
                      setShowRoleModal(true);
                    }
                    if (setIsLoading) setIsLoading(false);
                    return;
                  }

                  const loggedUser = resData?.user || JSON.parse(localStorage.getItem('user') || '{}');
                  
                  if (navigate) {
                    if (loggedUser?.role === 'technician') {
                      navigate('/technician/dashboard');
                    } else {
                      navigate('/dashboard');
                    }
                  }
                } catch (err) {
                  console.error('[GoogleSignIn] Auth failed:', err);
                  if (onError) onError(err.message || 'Google authentication failed. Please try again.');
                  if (setIsLoading) setIsLoading(false);
                }
              }}
              onError={() => {
                console.error('[GoogleSignIn] Google component reported onError');
                if (onError) onError('Google Log In Failed. Please check your browser popup settings and network connection.');
                setUseFallback(true);
              }}
              useOneTap={false}
              theme="outline"
              size="large"
              text="continue_with"
              width="100%"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleFallbackClick}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted/50 text-slate-800 dark:text-foreground font-semibold text-sm flex items-center justify-center gap-3 transition-colors shadow-sm cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{text}</span>
          </button>
        )}
      </div>

      {showRoleModal && (
        <RoleSelectionModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          onSelectAndProceed={handleRoleSelected}
          isLoading={roleModalLoading}
          userProfile={googleProfile}
        />
      )}
    </>
  );
}
