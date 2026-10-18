import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '../context/AuthContext';

export default function SignUp({ onShowToast }) {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Please enter your full name';
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Please enter a password';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Please accept the demo terms';
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
        await register(formData.name.trim(), formData.email.trim(), formData.password);
        // Automatically sign in upon registration
        await login(formData.email.trim(), formData.password);
        if (onShowToast) {
          onShowToast(`Account created! Welcome to VÉLOR, ${formData.name}!`, 'success');
        }
        navigate('/');
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Registration failed';
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

  return (
    <AuthLayout
      imageSrc="https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=1200&h=1400&fit=crop"
      imageAlt="VÉLOR private space"
    >
      <p className="text-xs tracking-[0.3em] uppercase text-[#666] mb-4">Create an Account</p>
      <h1 className="font-serif-display text-5xl lg:text-6xl font-normal mb-4">Create Your Account</h1>
      <p className="text-base text-[#666] mb-10">Join VÉLOR and discover your next favorite pieces.</p>

      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <label htmlFor="name" className="block text-sm mb-3">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            className={`w-full border-b ${errors.name ? 'border-red-500' : 'border-[#D0D0D0]'} bg-white py-4 px-1 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-2">{errors.name}</p>}
        </div>

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
          <p className="text-xs text-[#999] mt-2">Use 6 or more characters with a number.</p>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm mb-3">Confirm password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              className={`w-full border-b ${errors.confirmPassword ? 'border-red-500' : 'border-[#D0D0D0]'} bg-white py-4 px-1 pr-12 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#666] hover:text-[#0A0A0A] transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-2">{errors.confirmPassword}</p>}
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              className="w-4 h-4 border border-[#D0D0D0] rounded-none accent-[#0A0A0A]"
            />
            <span className="text-sm">I accept the demo terms</span>
          </label>
          {errors.acceptTerms && <p className="text-xs text-red-500 mt-2">{errors.acceptTerms}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#0A0A0A] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors mt-4 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Creating Account...' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-[#666] pt-4">
          Already have an account?{' '}
          <Link to="/signin" className="underline underline-offset-4 hover:text-[#0A0A0A] transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
