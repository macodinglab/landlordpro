import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Button, Card, Input } from '../../components';
import { KeyRound, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Zod schema for password reset
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Password has been reset successfully!');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-violet-200/30 dark:bg-violet-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-200/30 dark:bg-fuchsia-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md mx-auto relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-xl shadow-violet-200 dark:shadow-none mb-6">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Reset Password</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Enter your new password below
          </p>
        </div>

        <Card className="p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 dark:border-gray-700">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" role="form" aria-label="Reset Password form">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    {...register('password')}
                    className={`w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 transition-all font-medium ${errors.password
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-gray-100 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500/10'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-violet-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs font-bold ml-1">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Confirm Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    {...register('confirmPassword')}
                    className={`w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 transition-all font-medium ${errors.confirmPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-gray-100 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500/10'
                      }`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs font-bold ml-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200 dark:shadow-none transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <div className="text-center pt-2">
              <Link to="/login" className="text-sm font-bold text-gray-500 hover:text-violet-600 transition-colors inline-flex items-center gap-1">
                <ArrowRight className="rotate-180" size={14} />
                Back to Login
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
