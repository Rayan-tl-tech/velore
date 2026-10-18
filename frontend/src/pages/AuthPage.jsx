import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Loader2 } from 'lucide-react';

const EyeIcon = ({ open }) => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {open ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    )}
  </svg>
);

const EyeOpenIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const VelorLogo = ({ onNavigate }) => (
  <button
    type="button"
    onClick={() => onNavigate?.('shop')}
    className="font-serif-display text-3xl lg:text-4xl tracking-[0.2em] font-medium text-[#0A0A0A] hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
  >
    VÉLOR
  </button>
);

export default function AuthPage({ onNavigate, initialView = 'signin', onShowToast }) {
  const [view, setView] = useState(initialView); // 'signin' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sign in form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up form state
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, register } = useAuth();
  const { refreshCart, openBag } = useCart();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      await refreshCart();
      onShowToast?.('Welcome back! You have signed in successfully.', 'success');
      if (onNavigate) {
        onNavigate('shop');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!signupEmail.trim()) {
      setError('Email address is required.');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(fullName.trim(), signupEmail.trim(), signupPassword);
      setSuccess('Account created successfully! Signing you in...');
      onShowToast?.('Account created! Logging you in...', 'success');

      // Auto login after sign up
      try {
        await login(signupEmail.trim(), signupPassword);
        await refreshCart();
        if (onNavigate) {
          onNavigate('shop');
        }
      } catch {
        // If auto-login fails, switch to sign-in view
        setView('signin');
        setEmail(signupEmail);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col font-sans-body">
      {/* Navbar */}
      <nav className="bg-[#0A0A0A] text-white border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <div className="flex items-center space-x-8">
              <button
                type="button"
                onClick={() => onNavigate?.('shop')}
                className="font-serif-display text-2xl lg:text-3xl tracking-[0.15em] font-medium text-white hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
              >
                VÉLOR
              </button>
              <button
                onClick={() => onNavigate?.('shop')}
                className="text-white/70 hover:text-white font-medium text-sm tracking-wider uppercase px-3 py-2 transition-colors cursor-pointer"
              >
                Back to Store
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setView('signin');
                  setError('');
                  setSuccess('');
                }}
                className={`font-medium text-xs tracking-widest uppercase px-3 py-2 transition-colors cursor-pointer ${view === 'signin' ? 'text-white border-b-2 border-white' : 'text-white/60 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setView('signup');
                  setError('');
                  setSuccess('');
                }}
                className={`px-5 py-2 font-medium text-xs tracking-widest uppercase transition-all cursor-pointer ${
                  view === 'signup'
                    ? 'bg-white text-[#0A0A0A]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="w-full max-w-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
              <span className="font-semibold">Success:</span> {success}
            </div>
          )}

          {view === 'signin' ? (
            <form onSubmit={handleSignIn}>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Sign in</h1>
              <p className="text-gray-500 mb-10">
                New here?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('signup');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Create an account
                </button>
              </p>

              {/* Email Field */}
              <div className="mb-6">
                <label className="block text-gray-900 font-medium mb-2">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm transition-all"
                />
              </div>

              {/* Password Field */}
              <div className="mb-8">
                <label className="block text-gray-900 font-medium mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white pr-12 shadow-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeIcon open /> : <EyeOpenIcon />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-lg shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Create account</h1>
              <p className="text-gray-500 mb-10">
                Already have one?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('signin');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Sign in
                </button>
              </p>

              {/* Full Name Field */}
              <div className="mb-6">
                <label className="block text-gray-900 font-medium mb-2">Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm transition-all"
                />
              </div>

              {/* Email Field */}
              <div className="mb-6">
                <label className="block text-gray-900 font-medium mb-2">Email address</label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm transition-all"
                />
              </div>

              {/* Password Field */}
              <div className="mb-6">
                <label className="block text-gray-900 font-medium mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white pr-12 shadow-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeIcon open /> : <EyeOpenIcon />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="mb-8">
                <label className="block text-gray-900 font-medium mb-2">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white pr-12 shadow-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeIcon open /> : <EyeOpenIcon />}
                  </button>
                </div>
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-lg shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Help Button */}
      <button
        onClick={() => onShowToast?.('Need assistance? Email support@shopify.com or browse our FAQs.', 'info')}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-900 transition-colors z-50 focus:outline-none"
        aria-label="Help and FAQ"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2">
              <ShopifyLogo size="small" onNavigate={onNavigate} />
              <div className="ml-2">
                <span className="text-gray-400 text-sm">Your premium shopping destination.</span>
              </div>
            </div>
            <div className="flex space-x-8">
              <button onClick={() => onNavigate?.('shop')} className="text-gray-500 hover:text-gray-900 font-medium">Shop</button>
              <button onClick={() => openBag?.()} className="text-gray-500 hover:text-gray-900 font-medium">Cart</button>
              <button onClick={() => onNavigate?.('shop')} className="text-gray-500 hover:text-gray-900 font-medium">Orders</button>
              <button onClick={() => onNavigate?.('shop')} className="text-gray-500 hover:text-gray-900 font-medium">Profile</button>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8">
            <p className="text-gray-400 text-sm">
              © 2026 Shopify. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
