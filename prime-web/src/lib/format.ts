import type { RequisitionStatus } from './types'

export const SECTORS: { code: string; nameArabic: string }[] = [
  { code: '01', nameArabic: 'الكهرباء والتحكم الآلي' },
  { code: '02', nameArabic: 'الميكانيكا ونقل الحركة والهيدروليك' },
  { code: '03', nameArabic: 'الحراريات والعوازل الحرارية' },
  { code: '04', nameArabic: 'المسبوكات والبطانات المعدنية' },
  { code: '05', nameArabic: 'المغذيات وأنظمة نقل المواد السائبة' },
  { code: '06', nameArabic: 'أدوات الورش والمواد الاستهلاكية' },
  { code: '07', nameArabic: 'المصفيات والأنظمة البيئية' },
  { code: '08', nameArabic: 'الزيوت والكيماويات ومواد التشغيل' },
  { code: '09', nameArabic: 'التهوية وأنظمة التبريد' },
  { code: '10', nameArabic: 'الآليات والمعدات الثقيلة' },
]

export const STATUS_META: Record<
  RequisitionStatus,
  { label: string; badgeClass: string }
> = {
  NEW: {
    label: 'جديد',
    badgeClass:
      'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
  REVIEW: {
    label: 'قيد المراجعة',
    badgeClass:
      'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  DECLINED: {
    label: 'تم الرفض',
    badgeClass:
      'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  PROCESSING: {
    label: 'تحت المعالجة',
    badgeClass:
      'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  SUBMITTED: {
    label: 'تم التسليم',
    badgeClass:
      'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
  WON: {
    label: 'فائزة',
    badgeClass:
      'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  LOST: {
    label: 'خاسرة',
    badgeClass:
      'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
}

export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
  value: value as RequisitionStatus,
  label: meta.label,
}))

export const ALLOWED_TRANSITIONS: Record<RequisitionStatus, RequisitionStatus[]> = {
  NEW: ['REVIEW'],
  REVIEW: ['PROCESSING', 'DECLINED'],
  PROCESSING: ['SUBMITTED'],
  SUBMITTED: ['WON', 'LOST'],
  DECLINED: [],
  WON: [],
  LOST: [],
}

export const AUDIT_ACTION_META: Record<string, { label: string; tone: string }> = {
  Created: { label: 'إنشاء الطلب', tone: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  StatusChanged: { label: 'تغيير الحالة', tone: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  Updated: { label: 'تعديل البيانات', tone: 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return iso
  }
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024

export const ATTACHMENT_ALLOWED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.dwg', '.dxf', '.txt', '.csv',
]

export function validateAttachment(file: File): string | null {
  const extension = file.name.toLowerCase().split('.').pop()
  if (!extension || !ATTACHMENT_ALLOWED_EXTENSIONS.includes(`.${extension}`)) {
    return `الملف "${file.name}" بامتداد غير مسموح به`
  }
  if (file.size > ATTACHMENT_MAX_SIZE) {
    return `الملف "${file.name}" يتجاوز الحد الأقصى (10 م.ب)`
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 بايت'
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  } catch {
    return iso
  }
}

export function formatRelativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return 'الآن'
    if (minutes < 60) return `قبل ${minutes} دقيقة`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `قبل ${hours} ساعة`
    const days = Math.floor(hours / 24)
    if (days < 30) return `قبل ${days} يوم`
    const months = Math.floor(days / 30)
    return `قبل ${months} شهر`
  } catch {
    return iso
  }
}

export const NOTIFICATION_META: Record<string, { label: string; tone: string }> = {
  DueSoon: {
    label: 'قريب الاستحقاق',
    tone: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  Overdue: {
    label: 'متأخر',
    tone: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  SubmittedFollowUp: {
    label: 'متابعة',
    tone: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
}

export function getUrgencyMeta(daysLeft: number): { label: string; className: string } {
  if (daysLeft < 0) {
    return {
      label: 'متأخر',
      className:
        'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    }
  }
  if (daysLeft <= 1) {
    return {
      label: 'خلال 24 ساعة',
      className:
        'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    }
  }
  if (daysLeft <= 3) {
    return {
      label: 'خلال 3 أيام',
      className:
        'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    }
  }
  return {
    label: 'خلال ' + daysLeft + ' أيام',
    className:
      'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  }
}
