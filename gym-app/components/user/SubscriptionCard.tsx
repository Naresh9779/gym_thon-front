import { formatDate } from '@/lib/utils';

interface Props {
  planName: string;
  price: string;
  benefits?: string[];
  status?: 'active' | 'inactive' | 'trial' | 'expired';
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
}

const formatDateOrDash = (s?: string) => s ? formatDate(s) : '—';

export default function SubscriptionCard({ planName, price, benefits = [], status, startDate, endDate, durationMonths }: Props) {
  const statusStyle =
    status === 'active'  ? 'bg-[#00E676]/20 text-[#00E676]' :
    status === 'trial'   ? 'bg-blue-500/20 text-blue-400'   :
    status === 'expired' ? 'bg-red-500/20 text-red-400'     :
                           'bg-white/10 text-gray-400';

  return (
    <div className="hero-card p-5">
      {/* Top row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="label-cap text-gray-500 mb-1">Subscription</p>
          <h3 className="text-xl font-black text-white capitalize">{planName}</h3>
          <p className="text-2xl font-black text-[#00E676] mt-1 num">{price}</p>
        </div>
        {status && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${statusStyle}`}>
            {status}
          </span>
        )}
      </div>

      {/* Dates */}
      {(startDate || endDate || durationMonths) && (
        <div className="space-y-2 mb-5 pt-4 border-t border-white/10">
          {startDate && (
            <div className="flex justify-between items-center">
              <p className="label-cap">Start</p>
              <p className="text-sm font-bold text-white">{formatDateOrDash(startDate)}</p>
            </div>
          )}
          {endDate && (
            <div className="flex justify-between items-center">
              <p className="label-cap">Expires</p>
              <p className="text-sm font-bold text-white">{formatDateOrDash(endDate)}</p>
            </div>
          )}
          {durationMonths && (
            <div className="flex justify-between items-center">
              <p className="label-cap">Duration</p>
              <p className="text-sm font-bold text-white">{durationMonths} month{durationMonths !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}

      {/* Benefits */}
      {benefits.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-white/10">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] flex-shrink-0" />
              <p className="text-sm text-gray-300">{b}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {status !== 'active' && (
        <button className="mt-5 w-full py-3 rounded-xl bg-[#00E676] text-black font-black text-sm hover:bg-[#00C853] transition-colors">
          {status === 'expired' ? 'Renew Subscription' : 'Subscribe'}
        </button>
      )}
    </div>
  );
}
