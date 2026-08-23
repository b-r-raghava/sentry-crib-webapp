import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReturnToLogin?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessReturnToLogin
}) => {
  const { resetPassword, authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const ok = await resetPassword(email);
    setLoading(false);
    if (ok) {
      setSentSuccess(true);
    }
  };

  const handleClose = () => {
    clearError();
    setEmail('');
    setSentSuccess(false);
    onClose();
  };

  const handleReturnToLogin = () => {
    handleClose();
    if (onSuccessReturnToLogin) {
      onSuccessReturnToLogin();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="bg-surface rounded-3xl border border-outline-variant/60 shadow-2xl max-w-md w-full p-6 sm:p-8 text-on-surface relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Close dialog"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {!sentSuccess ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">lock_reset</span>
              </div>
              <div>
                <h3 id="forgot-password-title" className="font-headline-md text-lg font-bold text-on-surface">
                  Reset password
                </h3>
                <p className="font-caption text-xs text-on-surface-variant">SentryCrib Account Recovery</p>
              </div>
            </div>

            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-5 leading-relaxed">
              Enter the email associated with your SentryCrib account and we'll send you a password recovery link.
            </p>

            {authError && (
              <div className="p-3 mb-4 bg-error-container/80 text-on-error-container rounded-xl text-xs flex items-center gap-2" role="alert">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 font-label-sm">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-outline-variant text-on-surface font-label-sm text-xs font-semibold hover:bg-surface-container transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-label-sm text-xs font-bold hover:bg-primary-container transition-all shadow-xs active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 bg-primary-fixed text-on-primary-fixed rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <span className="material-symbols-outlined text-3xl">mark_email_read</span>
            </div>
            <div>
              <h3 className="font-headline-md text-lg font-bold text-on-surface">Instructions sent</h3>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed max-w-sm mx-auto">
                Password reset instructions have been sent to <strong>{email}</strong>. Please check your inbox and spam folder.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReturnToLogin}
              className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-label-sm text-xs font-bold hover:bg-primary-container transition-all shadow-xs"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
