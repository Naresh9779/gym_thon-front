"use client";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, ArrowLeft, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

function AuthPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === "admin" || user.role === "trainer") {
        router.push("/dashboard");
      } else {
        router.push("/home");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login(email, password);
      if (result.user.role === "admin" || result.user.role === "trainer") {
        router.push("/dashboard");
      } else {
        router.push("/home");
      }
    } catch {
      // error shown via hook
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8faf9]">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 relative overflow-hidden flex-col justify-between p-12">
        {/* Background blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-72 h-72 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">FitFlow</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Your fitness<br />journey starts<br />here.
          </h2>
          <p className="text-green-100 text-lg leading-relaxed max-w-sm">
            AI-powered workout and diet plans personalized for your goals.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 space-y-3">
          {["AI-generated workout plans", "Daily nutrition tracking", "Smart progress insights"].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="flex items-center gap-3 bg-white/15 backdrop-blur rounded-xl px-4 py-3"
            >
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="text-white text-sm font-medium">{f}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <button
            onClick={() => router.push("/")}
            className="mb-8 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>

          <div className="mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-green-100">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your FitFlow account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm shadow-md shadow-green-200 hover:shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}
