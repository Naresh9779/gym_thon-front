"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Zap, BarChart3, Clock, ChevronRight, Dumbbell, Salad, Brain } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, type: "tween" as const } },
};

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8faf9] overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">FitFlow</span>
          </div>
          <button
            onClick={() => router.push("/auth")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all"
          >
            Sign In <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-700 mb-6"
          >
            <Brain className="w-4 h-4" />
            AI-Powered Fitness Platform
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-[1.05] tracking-tight"
          >
            Train Smarter,<br />
            <span className="bg-gradient-to-r from-green-500 to-emerald-400 bg-clip-text text-transparent">
              Not Harder
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Generate personalized workout and nutrition plans instantly with AI.
            Track progress and hit your goals faster.
          </motion.p>

          {/* Role CTA Cards */}
          <motion.div
            variants={fadeUp}
            className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto"
          >
            {[
              {
                role: "trainer",
                icon: <Dumbbell className="w-7 h-7" />,
                title: "I'm a Trainer",
                desc: "Manage clients, generate AI plans, track progress",
                from: "from-green-500",
                to: "to-emerald-600",
                light: "bg-green-50 text-green-600",
              },
              {
                role: "user",
                icon: <Salad className="w-7 h-7" />,
                title: "I'm an Athlete",
                desc: "Get personalized plans and track your journey",
                from: "from-blue-500",
                to: "to-indigo-600",
                light: "bg-blue-50 text-blue-600",
              },
            ].map((item) => (
              <motion.button
                key={item.role}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/auth?role=${item.role}`)}
                className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all text-left overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.from} ${item.to} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className={`w-12 h-12 rounded-xl ${item.light} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h2>
                <p className="text-sm text-gray-500">{item.desc}</p>
                <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-y border-gray-100 bg-white py-10"
      >
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: "10K+", label: "Workouts Generated" },
            { value: "98%", label: "Satisfaction Rate" },
            { value: "3x", label: "Faster Results" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-3xl font-extrabold bg-gradient-to-r from-green-500 to-emerald-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center text-gray-900 mb-12"
        >
          Everything you need to succeed
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Brain className="w-6 h-6" />,
              color: "bg-purple-50 text-purple-600",
              title: "AI Plan Generation",
              desc: "Personalized workouts and nutrition plans built around your goals, body type, and schedule.",
            },
            {
              icon: <BarChart3 className="w-6 h-6" />,
              color: "bg-blue-50 text-blue-600",
              title: "Progress Tracking",
              desc: "Visual dashboards, streaks, and trend charts to keep you motivated and on track.",
            },
            {
              icon: <Clock className="w-6 h-6" />,
              color: "bg-amber-50 text-amber-600",
              title: "Smart Automation",
              desc: "Daily plans generated automatically. Never wonder what to eat or train again.",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © 2026 FitFlow. Powered by AI.
      </footer>
    </div>
  );
}
