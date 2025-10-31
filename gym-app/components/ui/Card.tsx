import React from "react";

interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
}

export function Card({ children, hover }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md ${hover ? 'hover:shadow-lg transition-shadow' : ''}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }: CardHeaderProps) {
  return (
    <div className="p-6 border-b">
      <h2 className="text-2xl font-bold">{title}</h2>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

export function CardBody({ children }: CardBodyProps) {
  return (
    <div className="p-6">
      {children}
    </div>
  );
}
