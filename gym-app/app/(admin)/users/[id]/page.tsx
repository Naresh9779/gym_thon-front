import UserCard from '@/components/admin/UserCard'
import UserStatsForm from '@/components/admin/UserStatsForm'

interface Props {
  params: { id: string }
}

export default function AdminUserDetail({ params }: Props) {
  // placeholder user data — in future get server-side
  const user = { id: params.id, name: 'Client Name', email: 'client@example.com' }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <UserCard id={user.id} name={user.name} email={user.email} />
        </div>
        <div className="md:col-span-2">
          <UserStatsForm />
        </div>
      </div>
    </div>
  )
}
