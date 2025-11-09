import React from 'react'

interface Props {
  planName: string
  price: string
  benefits?: string[]
  status?: 'active' | 'inactive' | 'trial' | 'expired'
  startDate?: string
  endDate?: string
  durationMonths?: number
}

export default function SubscriptionCard({ 
  planName, 
  price, 
  benefits = [],
  status,
  startDate,
  endDate,
  durationMonths
}: Props) {
  // Format dates
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Determine status color
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'expired':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'trial':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{planName}</h3>
          <p className="text-2xl font-semibold text-green-600">{price}</p>
        </div>
        {status && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
      </div>

      {/* Subscription Details */}
      {(startDate || endDate || durationMonths) && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          {startDate && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-medium text-gray-900">{formatDate(startDate)}</span>
            </div>
          )}
          {endDate && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">End Date:</span>
              <span className="font-medium text-gray-900">{formatDate(endDate)}</span>
            </div>
          )}
          {durationMonths && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium text-gray-900">{durationMonths} month{durationMonths !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Benefits */}
      {benefits.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Benefits</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Subscribe Button */}
      {status !== 'active' && (
        <div className="mt-4 pt-4 border-t">
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
            {status === 'expired' ? 'Renew Subscription' : 'Subscribe'}
          </button>
        </div>
      )}
    </div>
  )
}
