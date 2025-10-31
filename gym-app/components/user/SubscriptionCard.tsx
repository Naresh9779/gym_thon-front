import React from 'react'

interface Props {
  planName: string
  price: string
  benefits?: string[]
}

export default function SubscriptionCard({ planName, price, benefits = [] }: Props) {
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{planName}</div>
          <div className="text-sm text-gray-500">{price}</div>
        </div>
        <div>
          <button className="px-3 py-1 bg-green-600 text-white rounded">Subscribe</button>
        </div>
      </div>
      {benefits.length > 0 && (
        <ul className="mt-3 text-sm text-gray-600 list-disc list-inside">
          {benefits.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
    </div>
  )
}
