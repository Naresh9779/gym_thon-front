import React from 'react'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/Card'

interface Props {
  id?: string | number
  name: string
  email?: string
}

export default function UserCard({ id, name, email }: Props) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{name}</div>
            {email && <div className="text-sm text-gray-500">{email}</div>}
          </div>
          <div className="flex gap-2">
            <Link href={`/users/${id}`} className="text-sm text-blue-600 hover:text-blue-700">
              View
            </Link>
            <button className="text-sm text-red-600 hover:text-red-700">Remove</button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
