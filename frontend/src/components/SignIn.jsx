import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '../context/AuthContext';

export default function SignIn({ onShowToast }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Please enter your password';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setSubmitting(true);
      try {
        const userInfo = await login(formData.email.trim(), formData.password);
        if (onShowToast) {
          onShowToast(`Welcome back, ${userInfo?.name || 'Member'}!`, 'success');
        }
        navigate('/');
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Invalid email or password';
        setServerError(msg);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
    if (serverError) setServerError('');
  };

  const handleFillDemo = (email, password) => {
    setFormData({ email, password, remember: true });
    setErrors({});
    setServerError('');
  };

  return (
    <AuthLayout
      imageSrc="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&h=1400&fit=crop"
      imageAlt="VÉLOR private space"
    >
      <p className="text-xs tracking-[0.3em] uppercase text-[#666] mb-4">Member Access</p>
      <h1 className="font-serif-display text-5xl lg:text-6xl font-normal mb-4">Welcome Back</h1>
      <p className="text-base text-[#666] mb-10">Sign in to your VÉLOR account.</p>

      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm mb-3">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={`w-full border-b ${errors.email ? 'border-red-500' : 'border-[#D0D0D0]'} bg-white py-4 px-1 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors`}
          />
          {errors.email && <p className="text-xs text-red-500 mt-2">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm mb-3">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              className={`w-full border-b ${errors.password ? 'border-red-500' : 'border-[#D0D0D0]'} bg-white py-4 px-1 pr-12 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#666] hover:text-[#0A0A0A] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-2">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="remember"
              checked={formData.remember}
              onChange={handleChange}
              className="w-4 h-4 border border-[#D0D0D0] rounded-none accent-[#0A0A0A]"
            />
            <span className="text-sm">Remember me</span>
          </label>
          <button type="button" className="text-sm underline underline-offset-4 hover:text-[#333] transition-colors">
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#0A0A0A] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors mt-4 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Authenticating...' : 'Sign In'}
        </button>

        {/* Demo Credentials Helper */}
        <div className="pt-2 text-center">
          <p className="text-[11px] text-[#888] mb-2 tracking-wide">Quick Demo Accounts:</p>
          <div className="flex justify-center gap-4 text-xs text-[#555]">
            <button
              type="button"
              onClick={() => handleFillDemo('client@velor.com', 'Client1234!')}
              className="hover:text-[#0A0A0A] underline underline-offset-2 cursor-pointer"
            >
              Customer Demo
            </button>
            <span className="text-[#CCC]">·</span>
            <button
              type="button"
              onClick={() => handleFillDemo('admin@velor.com', 'Admin1234!')}
              className="hover:text-[#0A0A0A] underline underline-offset-2 cursor-pointer"
            >
              Admin Demo
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-[#666] pt-4">
          Don't have an account?{' '}
          <Link to="/register" className="underline underline-offset-4 hover:text-[#0A0A0A] transition-colors">
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
