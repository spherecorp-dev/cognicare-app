"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Brain, Mail, Lock, User, ArrowRight, Shield, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 glow-brand">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
          <p className="text-surface-400 text-sm mt-2">
            Begin your 8-week cognitive recovery journey
          </p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-surface-300 mb-2 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Robert Anderson"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-surface-300 mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-surface-300 mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-medium hover:from-brand-500 hover:to-brand-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-surface-400 mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-400 hover:text-brand-300">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-surface-500">
            <Shield className="w-3.5 h-3.5" />
            Secure connection — Bank-level encryption
          </div>
          <p className="text-xs text-surface-600 mt-3">
            60-day guarantee — 100% refund, no questions asked
          </p>
        </div>
      </div>
    </div>
  );
}
