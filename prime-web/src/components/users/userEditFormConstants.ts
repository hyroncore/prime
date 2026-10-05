export const USER_EDIT_FORM_TEXT = {
  back: 'العودة للمستخدمين',
  title: 'تعديل المستخدم',
  subtitle: 'تحديث دور المستخدم وحالة الحساب',
  username: 'اسم المستخدم',
  role: 'الدور',
  active: 'حالة الحساب',
  activeOn: 'حساب نشط',
  activeOff: 'حساب غير نشط',
  inactiveHint: 'الحسابات غير النشطة لا يمكنها تسجيل الدخول.',
  roles: {
    Admin: {
      label: 'مسؤول النظام',
      description: 'صلاحية كاملة لإدارة النظام وإعداداته.',
    },
    Manager: {
      label: 'مدير',
      description: 'يمكنه إدارة الفريق والبيانات المشتركة.',
    },
    User: {
      label: 'مستخدم قياسي',
      description: 'يمكنه عرض عمله وتعديله.',
    },
  },
  roleRequired: 'اختر دوراً للمستخدم.',
  activeRequired: 'حدد حالة الحساب.',
  loadFailed: 'تعذر تحميل بيانات المستخدم.',
  save: 'حفظ التعديلات',
  saving: 'جارٍ الحفظ…',
  cancel: 'إلغاء',
  saved: 'تم تعديل المستخدم بنجاح',
  saveFailed: 'تعذر حفظ التغييرات. حاول مرة أخرى.',
} as const
