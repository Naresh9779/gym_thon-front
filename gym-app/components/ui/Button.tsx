"use client";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 overflow-hidden";

  const variants = {
    primary:
      "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg shadow-green-200",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
    danger:
      "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-md shadow-red-100",
    outline:
      "border-2 border-green-500 text-green-600 hover:bg-green-50 bg-transparent",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3.5 text-base gap-2",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
      {children}
    </motion.button>
  );
}

export default Button;
