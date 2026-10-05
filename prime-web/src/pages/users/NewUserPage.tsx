import { Link, useNavigate } from 'react-router-dom'
import { UserForm } from '@/components/users/UserForm'
import { USER_FORM_TEXT } from '@/components/users/userFormConstants'

export function NewUserPage() {
  const navigate = useNavigate()

  return (
    <div dir="rtl" className="mx-auto max-w-[520px] space-y-6">
      <div className="space-y-3">
        <Link
          to="/users"
          className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {USER_FORM_TEXT.back}
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{USER_FORM_TEXT.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {USER_FORM_TEXT.subtitle}
          </p>
        </div>
      </div>

      <UserForm onCancel={() => navigate('/users')} />
    </div>
  )
}
