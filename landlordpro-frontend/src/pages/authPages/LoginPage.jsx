import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../services/AuthService';
import { showError, showSuccess } from '../../utils/toastHelper';

const Input = React.forwardRef(({ label, error, className, ...props }, ref) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-medium text-gray-400 mb-2">
        {label}
      </label>
    )}
    <input
      ref={ref}
      className={`w-full px-4 py-3 rounded-lg border ${error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-700 focus:border-teal-500 focus:ring-teal-500'
        } bg-gray-800/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${className}`}
      {...props}
    />
    {error && (
      <p className="text-sm text-red-400 font-medium mt-1">
        {error}
      </p>
    )}
  </div>
));

const Button = ({ children, className, onClick, ...props }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await loginUser(formData.email, formData.password);
      if (response && response.token) {
        showSuccess('Login successful!');
        const user = response.user;
        const role = String(user?.role || '').toLowerCase();
        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'manager') {
          navigate('/manager');
        } else {
          // Fallback if role is unknown or missing
          navigate('/admin');
        }
      }
    } catch (error) {
      console.error("Login Error:", error);
      showError(error.message || 'Invalid email or password');
      setErrors({ form: error.message || 'Login failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500 rounded-2xl mb-6">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-white mb-2">
            LandlordPro
          </h1>
          <p className="text-gray-400 text-sm">
            Property Management Simplified
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-8 bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50">
          {/* Card Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-400 text-sm">
              Sign in to continue to your account
            </p>
          </div>

          {/* Form Container */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* General Error Message */}
            {errors.form && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {errors.form}
              </div>
            )}

            {/* Email Input */}
            <div>
              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[42px] text-gray-400 hover:text-teal-400 transition-colors duration-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 text-teal-500 border-gray-600 rounded bg-gray-700 focus:ring-teal-500 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  Remember me
                </span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm text-white hover:text-teal-400 font-medium transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </Button>
          </form>

        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-white hover:text-teal-400 transition-colors">
              Terms
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-white hover:text-teal-400 transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;