import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, hover, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm",
        hover && "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
