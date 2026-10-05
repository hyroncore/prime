# TTSM Design & UI Guidelines

> **Primary accent color:** `#415a77` / `var(--primary)` — applied via `className="bg-primary text-primary-foreground"` or inline for dynamic cases. Used for primary buttons, active states, focus rings, and interactive highlights.
>
> **Border palette:** `#d4dce6` (border, `212 18% 86%`) for dividers/card borders, `#b8c6d8` (border-hover, `212 22% 78%`) for interactive borders on hover. Already set via `--border` and configurable via Tailwind.
>
> **Icons:** ZERO icons anywhere — no `lucide-react`, no SVGs, no emoji-as-icons. Use pure typography, spacing, backgrounds, and borders for visual hierarchy.

---

## 1. Core Design Principles

| Principle | Rule |
|-----------|------|
| **No icons** | Zero icon imports or SVGs. Communicate with text labels, spacing, borders, backgrounds. |
| **Shadcn UI** | Use shadcn primitives: `Card`, `Button`, `Input`, `Badge`, `Separator`, `Table`, `Sheet`, `AlertDialog`, `Skeleton`, `Dialog`. |
| **Subtle shadows** | Use Tailwind shadow classes: `shadow-sm` on cards, `shadow-md` on elevated elements. |
| **Rounded corners** | shadcn defaults: `rounded-xl` for cards, `rounded-lg` for buttons/inputs, `rounded-full` for badges. |
| **#415a77 accent** | Primary accent for CTAs, active nav, selection highlights, focus rings (`ring-primary/40`). |
| **Monochrome text** | Hierarchy via weight (`font-semibold`, `font-bold`, `font-black`) and contrast (`text-muted-foreground`, `text-foreground`). |
| **RTL Arabic** | Set `dir="rtl"` at the page root. Prefer logical utilities (`text-start`, `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`) over physical left/right utilities so layout remains direction-safe. |

---

## 2. Page Layout

### 2.1 Page Shell

```jsx
<div dir="rtl" className="space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-black tracking-tight">Page Title</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Page subtitle</p>
    </div>
    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
      Action
    </Button>
  </div>
  ...
</div>
```

### 2.2 KPI Metric Cards

```jsx
<div className="grid grid-cols-4 gap-4">
  {stats.map((stat, i) => (
    <Card key={i} className="p-5">
      <p className="text-xs font-bold text-muted-foreground tracking-wide mb-2">{stat.title}</p>
      <div className="text-2xl font-black">{stat.value}</div>
      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{stat.subtitle}</p>
    </Card>
  ))}
</div>
```

### 2.3 Loading State

```jsx
if (loading) return (
  <div className="space-y-5">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-48 rounded-lg mb-2" />
        <Skeleton className="h-4 w-64 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-28 rounded-lg" />
    </div>
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-3 w-24 rounded mb-3" />
          <Skeleton className="h-7 w-32 rounded mb-1" />
          <Skeleton className="h-3 w-20 rounded" />
        </Card>
      ))}
    </div>
    <Card>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
          {Array.from({ length: 8 }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1 rounded" />
          ))}
        </div>
      ))}
    </Card>
  </div>
);
```

---

## 3. Tables

### 3.1 shadcn Table

```jsx
<Card className="overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow className="border-b border-border hover:bg-transparent">
        {columns.map((col) => (
          <TableHead key={col.key}
            className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4"
          >
            {col.label}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.length === 0 ? (
        <TableRow>
          <TableCell colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
            لا توجد نتائج
          </TableCell>
        </TableRow>
      ) : data.map((row) => (
        <TableRow key={row.id}
          className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
        >
          <TableCell className="px-4 py-3.5">
            <span className="text-xs font-bold">{row.value}</span>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Card>
```

### 3.2 Sortable Columns

3-state: `asc → desc → none`.

```jsx
<TableHead className="...">
  <button onClick={() => handleSort(key)}
    className="inline-flex items-center cursor-pointer hover:text-foreground"
  >
    {label}
    {sortKey === key && <SortIndicator direction={sortDir} />}
  </button>
</TableHead>

function SortIndicator({ direction }) {
  if (!direction) return null;
  return <span className="text-[10px] font-bold ms-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}
```

### 3.3 Actions Column

```jsx
<TableCell className="px-4 py-3.5 text-center">
  <button onClick={() => setDrawerId(row.id)}
    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
  >
    عرض
  </button>
</TableCell>
```

### 3.4 Pagination

```jsx
<div className="flex items-center justify-between px-4 py-3 border-t border-border">
  <span className="text-xs text-muted-foreground">عرض {filtered} من إجمالي {total}</span>
  <div className="flex items-center gap-2">
    <button disabled={page <= 1} onClick={prevPage}
      className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default"
    >السابق</button>
    <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
    <button disabled={page >= totalPages} onClick={nextPage}
      className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default"
    >التالي</button>
  </div>
</div>
```

---

## 4. Search & Filter

### 4.1 Search

```jsx
<Input
  placeholder="بحث..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="h-9 text-sm max-w-md"
/>
```

### 4.2 Filter Tabs (2-3 options)

```jsx
<div className="flex gap-1 border border-border rounded-lg p-1 bg-card">
  {tabs.map((tab) => (
    <button key={tab.key} onClick={() => setFilter(tab.key)}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
        activeTab === tab.key ? 'bg-card border border-border text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >{tab.label}</button>
  ))}
</div>
```

### 4.3 Filter Dropdown (4+)

```jsx
<div className="relative">
  <button onClick={() => setShowFilter(!showFilter)}
    className="text-xs font-semibold text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors"
  >تصفية</button>
  {showFilter && (
    <div className="absolute top-full start-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-md z-10 py-1">
      {options.map((opt) => (
        <button key={opt.key} onClick={() => { setFilter(opt.key); setShowFilter(false); }}
          className={`w-full text-start px-3 py-1.5 text-xs transition-colors ${
            activeFilter === opt.key ? 'bg-muted font-bold text-primary' : 'hover:bg-muted/50'
          }`}
        >{opt.label}</button>
      ))}
      {activeFilter && (
        <>
          <div className="border-t border-border my-1" />
          <button onClick={() => { setFilter(null); setShowFilter(false); }}
            className="w-full text-start px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
          >إظهار الكل</button>
        </>
      )}
    </div>
  )}
</div>
```

---

## 5. Status Badges

All badges use shadcn default size with `rounded-full py-0` for a compact pill shape. Dark mode uses `*-950/40` background, `*-400` text, and `*-800` border.

```jsx
import { Badge } from '../components/ui/badge';

const statusConfig = {
  paid:    { label: 'مدفوعة', class: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/60' },
  partial: { label: 'مدفوعة جزئيا', class: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/60' },
  pending: { label: 'معلقة', class: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/60' },
  overdue: { label: 'متأخرة', class: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/60' },
  inactive: { label: 'موقف', class: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/60' },
};

<Badge variant="outline" className={`rounded-full py-0 ${cfg.class}`}>
  {cfg.label}
</Badge>
```

For muted (InvoicesPage style — all gray, overdue uses `text-primary`):

```jsx
const mutedConfig = {
  paid:    { label: 'مدفوعة', class: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/60' },
  partial: { label: 'مدفوعة جزئيا', class: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/60' },
  pending: { label: 'معلقة', class: 'bg-gray-100 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/60' },
  overdue: { label: 'متأخرة', class: 'bg-gray-100 dark:bg-gray-900/40 text-primary dark:text-primary border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/60' },
};

<Badge variant="outline" className={`rounded-full py-0 ${cfg.class}`}>
  {cfg.label}
</Badge>
```

---

## 6. Drawers

```jsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';

<Sheet open={!!drawerId} onOpenChange={(open) => { if (!open) setDrawerId(null); }}>
  <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
    <SheetHeader className="mb-6">
      <SheetTitle className="text-base font-black">Title</SheetTitle>
    </SheetHeader>
    {/* content */}
  </SheetContent>
</Sheet>
```

---

## 7. Delete Confirmation

```jsx
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent className="max-w-sm">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-sm font-black">تأكيد الحذف</AlertDialogTitle>
      <AlertDialogDescription className="text-xs">
        هل أنت متأكد من حذف <span className="font-bold text-foreground">{name}</span>؟
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full text-xs font-bold"
        onClick={handleDelete}
      >حذف</Button>
      <Button variant="outline" onClick={() => setShowDeleteDialog(false)}
        className="w-full text-xs font-semibold"
      >إلغاء</Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 8. Modal Dialogs

```jsx
<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle className="text-sm font-black">Modal Title</DialogTitle>
    </DialogHeader>
    {/* form fields */}
    <div className="flex flex-col gap-2">
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full text-xs font-bold">
        حفظ
      </Button>
      <Button variant="outline" onClick={() => setShowModal(false)} className="w-full text-xs font-semibold">
        إلغاء
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## 9. Forms

| Element | Component | Notes |
|---------|-----------|-------|
| Text input | `<Input>` | shadcn `rounded-lg`; use `h-11` for standalone forms and at least `h-9` in dense layouts |
| Select | `<select>` native | `rounded-lg border border-input`; match the height of neighboring controls |
| Toggle | `<Switch>` | Use the shared Switch component and provide an accessible label |
| File input | Native `<input type="file">` | Standard border styling |
| Date | `<input type="date">` | Match Input border and height classes |

### 9.1 Standalone Create/Edit Pages

Use the `/users/new` page as the reference pattern for focused account-creation forms:

- Put `dir="rtl"` on the page root and constrain the content to a single column (`max-w-[520px]`); do not add a card, decorative panel, or page-level shadow.
- Start with a text-only back link, then a page title and a short subtitle. Keep the page hierarchy and spacing generous but compact (`space-y-6` between major groups).
- Place each field label above its control. Use full-width, minimum 44px (`h-11`) inputs, switches, and action buttons, with the standard theme tokens and visible `focus-visible` rings.
- Keep labels, hints, validation messages, and action copy in one page-specific constants object so UI text can be translated consistently.
- Prefer the logical utilities from the RTL rule above. For mixed-direction values such as usernames and passwords, set `dir="ltr"` on the input itself while retaining the RTL page layout.
- Choose controls that expose meaningful choices directly. For a small set of roles with descriptions, use a vertical radio group; for a binary account state, use a labeled switch with helper text. Avoid replacing these with generic dropdowns or unlabeled toggles.
- Validate on blur and submit. After a field has an error, revalidate it on change. Associate errors and hints with their controls using `aria-invalid` and `aria-describedby`, announce errors with `role="alert"`, and focus the first invalid field after an unsuccessful submit.
- Keep one filled primary action and a ghost cancel action. In RTL, put the primary action first in DOM order so it appears on the right; stack both as full-width buttons below 480px. Disable repeat submission while saving and expose the busy state to assistive technology.
- On success, show the standard toast and navigate to the relevant list. Surface server-side field errors beside the matching field instead of replacing them with a generic success-shaped fallback.

```jsx
<div dir="rtl" className="mx-auto max-w-[520px] space-y-6">
  <header className="space-y-3">
    <Link to="/users" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      العودة للمستخدمين
    </Link>
    <div>
      <h1 className="text-2xl font-black tracking-tight">إضافة مستخدم جديد</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">إنشاء حساب دخول جديد مع صلاحية دور محدد</p>
    </div>
  </header>

  <form className="space-y-7">
    {/* Each field uses a label above its full-width control, with hint/error text below. */}
    <div className="flex flex-col gap-3 pt-1 min-[480px]:flex-row">
      <Button type="submit" className="h-11 w-full bg-primary text-primary-foreground min-[480px]:w-auto">
        حفظ المستخدم
      </Button>
      <Button type="button" variant="ghost" className="h-11 w-full min-[480px]:w-auto">
        إلغاء
      </Button>
    </div>
  </form>
</div>
```

---

## 10. Typography Scale

| Context | Classes |
|---------|---------|
| Page title | `text-2xl font-black tracking-tight` |
| Page subtitle | `text-sm text-muted-foreground mt-0.5` |
| Metric value | `text-2xl font-black` |
| Metric title | `text-xs font-bold text-muted-foreground tracking-wide` |
| Metric subtitle | `text-[11px] text-muted-foreground font-medium mt-0.5` |
| Section header | `text-xs font-bold text-muted-foreground tracking-wide mb-3` |
| Table header | `text-[11px] font-bold text-muted-foreground tracking-wider` |
| Cell value | `text-xs font-semibold` or `text-xs font-bold` |
| Status badge | shadcn default (`text-xs font-semibold`) + `rounded-full py-0` |
| Primary button | `text-xs font-bold` |
| Secondary button | `text-xs font-semibold` |

---

## 11. Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#415a77` (212 29% 36%) | Buttons, active states, focus rings, overdue text |
| `--primary-foreground` | white | Text on primary backgrounds |
| `--border` | `#d4dce6` (212 18% 86%) | Cards, tables, dividers, inputs |
| `border-hover` (inline) | `#b8c6d8` (212 22% 78%) | Card border on hover, interactive states |
| `text-muted-foreground` | `--muted-foreground` | Labels, captions, placeholder |
| `text-foreground` | `--foreground` | Body text, values |
| `bg-card` | `--card` | Card surfaces |
| `bg-muted` | `--muted` | Hover backgrounds, subtle fills |
| Green (success) | `bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800` | Success / paid / active states |
| Amber (pending) | `bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800` | Warning / pending / processing states |
| Red (danger) | `bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800` | Error / overdue / rejected states |
| Blue (info) | `bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800` | Info / partial states |
| Gray (muted) | `bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700` | Inactive / muted states |

---

## 12. Drawer Content Layout

```jsx
<div className="px-6 py-5 space-y-6">
  {/* Hero / Summary */}
  <div className="text-center py-2">...</div>

  <Separator />

  {/* Info Grid */}
  <div className="grid grid-cols-2 gap-x-6 gap-y-3">...</div>

  <Separator />

  {/* Section */}
  <div>
    <p className="text-xs font-bold text-muted-foreground tracking-wide mb-3">Section title</p>
    ...
  </div>
</div>
```

Footer:

```jsx
<div className="shrink-0 px-6 py-4 border-t border-border flex items-center justify-between">
  <Button variant="outline" size="sm" onClick={onClose}>إغلاق</Button>
  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Action</Button>
</div>
```

---

## 13. Interactive States

| Element | Style |
|---------|-------|
| Primary button | `bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]` |
| Outline button | `border border-border hover:bg-muted active:scale-[0.98]` |
| Table row | `hover:bg-muted/40 transition-colors cursor-pointer` |
| Active filter tab | `bg-card border border-border shadow-sm` |
| Card hover | `hover:border-[#b8c6d8] transition-colors` |

---

## 14. Disabled

```jsx
<Button disabled className="opacity-50 cursor-not-allowed">حفظ</Button>
```

---

## 15. What NOT to do

- ❌ No `lucide-react` or any icon library
- ❌ No SVGs or emoji as icons
- ❌ No `image` or `avatar` elements
- ❌ No color gradients on backgrounds
- ❌ No raw `div` when a shadcn component exists (`Card`, `Button`, `Input`, `Badge`, etc.)
- ❌ No `animate-pulse` on non-Skeleton elements
