import { Link, useLocation } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { HEADER_TEXT } from './constants'

interface Crumb {
  label: string
  href?: string
}

function getBreadcrumbs(pathname: string): Crumb[] {
  const path = pathname.replace(/\/+$/, '') || '/'
  const segments = path.split('/').filter(Boolean)

  if (path === '/') return [{ label: HEADER_TEXT.home }]
  if (path === '/dashboard') return [{ label: HEADER_TEXT.dashboard }]
  if (path === '/dashboard/user') return [{ label: HEADER_TEXT.userDashboard }]
  if (path === '/dashboard/manager') return [{ label: HEADER_TEXT.managerDashboard }]
  if (path === '/dashboard/admin') return [{ label: HEADER_TEXT.adminDashboard }]
  if (path === '/requisitions') return [{ label: HEADER_TEXT.requisitions }]
  if (path === '/requisitions/new') {
    return [
      { label: HEADER_TEXT.requisitions, href: '/requisitions' },
      { label: HEADER_TEXT.newRequisition },
    ]
  }
  if (segments[0] === 'requisitions' && segments.length >= 2) {
    const detailCrumbs: Crumb[] = [
      { label: HEADER_TEXT.requisitions, href: '/requisitions' },
      {
        label: HEADER_TEXT.requisitionDetailWithNumber(segments[1]),
        href: `/requisitions/${segments[1]}`,
      },
    ]
    if (segments[2] === 'edit') detailCrumbs.push({ label: HEADER_TEXT.editRequisition })
    if (segments[2] === 'print') detailCrumbs.push({ label: HEADER_TEXT.printRequisition })
    if (detailCrumbs.length === 2 && path === `/requisitions/${segments[1]}`) {
      detailCrumbs[1] = { label: HEADER_TEXT.requisitionDetailWithNumber(segments[1]) }
    }
    return detailCrumbs
  }
  if (path === '/clients') return [{ label: HEADER_TEXT.clients }]
  if (path === '/clients/new') {
    return [
      { label: HEADER_TEXT.clients, href: '/clients' },
      { label: HEADER_TEXT.newClient },
    ]
  }
  if (path === '/users') return [{ label: HEADER_TEXT.users }]
  if (path === '/users/new') {
    return [
      { label: HEADER_TEXT.users, href: '/users' },
      { label: HEADER_TEXT.newUser },
    ]
  }
  if (segments[0] === 'users' && segments.length >= 3 && segments[2] === 'edit') {
    return [
      { label: HEADER_TEXT.users, href: '/users' },
      { label: HEADER_TEXT.editUser },
    ]
  }
  if (path === '/account') return [{ label: HEADER_TEXT.account }]
  if (path === '/settings') return [{ label: HEADER_TEXT.settings }]
  if (path === '/workflow') return [{ label: HEADER_TEXT.workflow }]

  return [{ label: HEADER_TEXT.page }]
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const items = getBreadcrumbs(pathname)

  return (
    <Breadcrumb aria-label={HEADER_TEXT.breadcrumbs} className="min-w-0 flex-1 overflow-hidden">
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
        {items.map((item, index) => (
          <BreadcrumbItem
            key={`${item.href ?? item.label}-${index}`}
            className={index === items.length - 1 ? 'min-w-0 flex-1 overflow-hidden' : 'shrink-0'}
          >
            {index > 0 && <BreadcrumbSeparator />}
            {item.href ? (
              <Link
                to={item.href}
                className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ) : (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
