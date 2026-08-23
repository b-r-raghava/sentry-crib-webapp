import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const SignUpScreen: React.FC = () => {
  const { signUp, setCurrentPublicScreen, authError, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);
    await signUp(name, email, password);
    setLoading(false);
  };

  const handleNavigateToLogin = () => {
    clearError();
    setValidationError(null);
    setCurrentPublicScreen('login');
  };

  const handleNavigateHome = () => {
    clearError();
    setValidationError(null);
    setCurrentPublicScreen('landing');
  };

  const currentError = validationError || authError;

  return (
    <div className="min-h-screen bg-soft-sand flex flex-col justify-between p-4 sm:p-6 lg:p-8 dot-pattern-bg select-none animate-fade-in">
      {/* Top Bar with Brand */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleNavigateHome}
          className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1"
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            security
          </span>
          <span className="font-headline-md text-lg font-bold tracking-tight">SentryCrib</span>
        </button>

        <button
          type="button"
          onClick={handleNavigateHome}
          className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to overview</span>
        </button>
      </header>

      {/* Center Auth Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-cream-container border border-outline-variant/60 rounded-3xl p-6 sm:p-10 shadow-sm">
          {/* Header */}
          <div className="mb-6 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-fixed text-on-primary-fixed rounded-full text-[11px] font-bold uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                child_care
              </span>
              <span>Caregiver Registration</span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface">
              Create your SentryCrib.
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
              Set up your account and start creating a safer monitored space.
            </p>
          </div>

          {/* Error Message */}
          {currentError && (
            <div className="p-3.5 mb-5 bg-error-container text-on-error-container rounded-2xl text-xs flex items-start gap-2.5 shadow-2xs border border-error/20" role="alert">
              <span className="material-symbols-outlined text-lg text-error shrink-0 mt-0.5">error</span>
              <span className="leading-snug">{currentError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 font-label-sm">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoFocus
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Johnson"
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline/60"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 font-label-sm">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@example.com"
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline/60"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 font-label-sm">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 font-label-sm">
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline/60"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name || !email || !password || !confirmPassword}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-primary text-on-primary font-label-sm text-sm font-bold hover:bg-primary-container transition-all shadow-sm active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-outline-variant/40 text-center">
            <p className="text-xs text-on-surface-variant">
              Already have a SentryCrib account?{' '}
              <button
                type="button"
                onClick={handleNavigateToLogin}
                className="font-bold text-primary hover:underline focus:outline-none"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center text-xs text-outline py-2">
        <span>© 2026 SentryCrib • Privacy-First Infant Safety</span>
      </footer>
    </div>
  );
};
