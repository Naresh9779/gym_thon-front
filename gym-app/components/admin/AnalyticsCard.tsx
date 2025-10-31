import React from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

type Accent = 'green' | 'blue' | 'purple' | 'amber' | 'rose' | 'gray';

interface Props {
  title: string
  value: string | number
  subtitle?: string
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  accent?: Accent
  showTrend?: boolean
}

export default function AnalyticsCard({ title, value, subtitle, Icon, accent = 'gray', showTrend = false }: Props) {
  const accentClasses: Record<Accent, { ring: string; bg: string; icon: string }> = {
    green:  { ring: 'ring-green-100',  bg: 'bg-green-50',  icon: 'text-green-600' },
    blue:   { ring: 'ring-blue-100',   bg: 'bg-blue-50',   icon: 'text-blue-600' },
    purple: { ring: 'ring-purple-100', bg: 'bg-purple-50', icon: 'text-purple-600' },
    amber:  { ring: 'ring-amber-100',  bg: 'bg-amber-50',  icon: 'text-amber-600' },
    rose:   { ring: 'ring-rose-100',   bg: 'bg-rose-50',   icon: 'text-rose-600' },
    gray:   { ring: 'ring-gray-100',   bg: 'bg-gray-50',   icon: 'text-gray-600' },
  };
  const a = accentClasses[accent];

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody>
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold">{value}</div>
          <div className="flex items-center gap-2">
            {showTrend && (
              <div className={`hidden sm:block text-sm text-gray-500`}>(trend)</div>
            )}
            {Icon && (
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${a.bg} ring-8 ${a.ring}`}>
                <Icon className={`w-5 h-5 ${a.icon}`} />
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
