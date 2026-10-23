import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

/**
 * Quick login/register modal shown when a guest tries to add to cart or clicks "Sign In" / "Join Free".
 */
export default function AuthModal({ onClose, onSuccess }) {
  const { login, register } = useAuth();
  const { refreshCart } = useCart();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Animation Lifecycle: enter → visible → exit → unmount
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleRequestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(() => {
      onClose();
    }, 240);
  }, [onClose]);

  // Keyboard accessibility: Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestClose]);

  // Lock background body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const resetForm = () => {
    setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
    setError(''); setSuccess('');
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (mode === 'register') {
      if (!name.trim()) return setError('Name is required.');
      if (password.length < 6) return setError('Password must be at least 6 characters.');
      if (password !== confirmPassword) return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        await refreshCart();
        onSuccess?.();
        handleRequestClose();
      } else {
        await register(name, email, password);
        setSuccess('Account created! Please sign in.');
        setTimeout(() => switchMode('login'), 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans-body"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? 'Sign In Modal' : 'Create Account Modal'}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[240ms] ease-out cursor-pointer ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleRequestClose}
      />

      {/* Modal */}
      <div
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 z-10 transform transition-[transform,opacity] duration-[240ms] ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.98] translate-y-1'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleRequestClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo / Brand */}
        <div className="flex justify-center mb-4">
          <div className="bg-[#0A0A0A] text-white px-5 py-2 font-serif-display text-sm tracking-[0.2em] uppercase">
            VÉLOR
          </div>
        </div>

        <h2 className="font-serif-display text-2xl font-normal text-[#0A0A0A] text-center mb-1">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <p className="text-[#666] text-center text-xs mb-6">
          {mode === 'login' ? 'Sign in to save pieces and manage your wardrobe.' : 'Join VÉLOR to start curating your wardrobe.'}
        </p>

        {/* Error / Success banners */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 border border-[#CCC] focus:outline-none focus:border-[#0A0A0A] text-xs"
              />
            </div>
          )}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 border border-[#CCC] focus:outline-none focus:border-[#0A0A0A] text-xs"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-[#CCC] focus:outline-none focus:border-[#0A0A0A] text-xs"
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-[#CCC] focus:outline-none focus:border-[#0A0A0A] text-xs"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0A0A0A] text-white text-xs uppercase tracking-[0.2em] font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-3 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Switch mode link */}
        <p className="text-center text-xs text-[#666] mt-6">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button onClick={() => switchMode('register')} className="text-[#0A0A0A] font-semibold underline hover:opacity-70 cursor-pointer">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-[#0A0A0A] font-semibold underline hover:opacity-70 cursor-pointer">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
