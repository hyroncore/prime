# TTSM Design & UI Guidelines

This document is the shared visual and interaction standard for the React application. Follow existing component patterns first, then use these guidelines to keep new and updated pages consistent.

## 1. Design principles

- **Clean and minimal:** prioritize clear hierarchy, concise content, and generous but purposeful spacing. Include only information and actions relevant to the task.
- **Use cards with intent:** use shadcn `Card` to group related information or actions, as on the Account page. Avoid nested cards, decorative panels, and putting every form or page inside a card.
- **Use the shared design system:** prefer existing shadcn components, theme tokens, and project helpers over one-off styling.
- **Typography over decoration:** establish hierarchy with font size, weight, and muted text; do not rely on icons or color alone.
- **No icons:** do not add icon libraries, SVG icons, or emoji as icons. Use text and layout to communicate.
- **Support light and dark themes:** use semantic theme tokens and verify contrast in both themes.
- **Arabic and RTL by default:** pages are Arabic RTL unless the product requirement says otherwise.

## 2. Theme and visual language

Use theme tokens rather than hard-coded colors for standard UI:

| Token | Value / purpose |
|---|---|
| `bg-background`, `text-foreground` | Main page surface and primary text |
| `bg-card`, `text-card-foreground` | Card surfaces and their text |
| `bg-muted`, `text-muted-foreground` | Subtle fills, helper text, labels, and secondary information |
| `bg-primary`, `text-primary-foreground` | Primary actions and selected states |
| `border-border`, `border-input` | Dividers, cards, and form controls |
| `ring-primary` | Keyboard focus indication |

The primary accent is `#415a77` (`var(--primary)`). The standard border is `#d4dce6`; interactive border hover may use `#b8c6d8` where appropriate. Avoid gradients and unnecessary decorative color.

Use the shared corner conventions: `rounded-xl` for cards, `rounded-lg` for buttons and inputs, and `rounded-full` for compact badges. Apply shadows only to communicate elevation; do not add extra shadows to otherwise flat, minimal account or form pages.

## 3. RTL, layout, and responsive behavior

- Put `dir="rtl"` on every Arabic page root.
- Prefer logical CSS utilities: `text-start`, `ms-*`/`me-*`, `ps-*`/`pe-*`, and `start-*`/`end-*`. Avoid physical left/right utilities for directional layout.
- Keep mixed-direction values such as usernames, emails, and passwords readable by setting `dir="ltr"` on the value/control itself.
- Use responsive grids and wrapping rows. Avoid fixed widths that overflow on mobile; controls should remain usable without horizontal scrolling.
- Give interactive controls visible `focus-visible` rings and sufficient hit areas. Standalone form controls and primary actions should be at least 44px tall; dense table controls may be smaller when still usable.
- Use consistent spacing (`space-y-6` for major page sections; `space-y-7` is suitable between standalone form fields).

## 4. Page shell and hierarchy

Use a consistent page title and optional short subtitle. Place the page’s primary action beside the heading when appropriate; do not add a subtitle that merely repeats the title.

```jsx
<div dir="rtl" className="space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-black tracking-tight">عنوان الصفحة</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">وصف مختصر عند الحاجة</p>
    </div>
    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
      إجراء رئيسي
    </Button>
  </header>
  {/* Page content */}
</div>
```

### 4.1 Clean account and settings pages

Use the Account page as the reference for profile, security, and preference screens:

- Keep the page shell readable and focused (for example, `mx-auto max-w-3xl space-y-6`).
- Place each related topic in its own shadcn `Card`, with a concise `CardTitle` and content in `CardContent`.
- Do not add nested cards or decorative containers. Cards should group meaningful content, not serve as decoration.
- For account details, show a compact identity heading and optional role badge, then a responsive details grid. Use a small muted label above each clear value and a subtle divider where it improves grouping.
- For security or preference settings, use a simple row with a short explanation and its action/control. Allow rows to stack or wrap on narrow screens.
- Place global or session-level actions such as sign out outside informational cards in a restrained footer area.
- Keep only relevant account data and actions; do not add avatar/image elements or filler content.

```jsx
<div dir="rtl" className="mx-auto max-w-3xl space-y-6">
  <header>
    <h1 className="text-2xl font-black tracking-tight">الحساب</h1>
    <p className="mt-0.5 text-sm text-muted-foreground">عرض معلومات حسابك وإدارة كلمة المرور</p>
  </header>

  <Card>
    <CardHeader className="pb-4">
      <CardTitle className="text-sm font-black">معلومات الحساب</CardTitle>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">اسم المستخدم</h2>
        <Badge variant="outline" className="rounded-full py-0">الدور</Badge>
      </div>
      <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground">حالة الحساب</p>
          <p className="text-sm font-semibold">نشط</p>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

### 4.2 KPI cards

Use metric cards when they help users scan a small set of important totals. Keep titles muted, values prominent, and supporting text brief. Make the grid responsive rather than forcing four columns at every viewport.

```jsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {stats.map((stat) => (
    <Card key={stat.title} className="p-5">
      <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">{stat.title}</p>
      <p className="text-2xl font-black">{stat.value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{stat.subtitle}</p>
    </Card>
  ))}
</div>
```

### 4.3 Loading states

Use the shared `Skeleton` component to preserve the shape of the content being loaded. Avoid using `animate-pulse` on non-skeleton content.

```jsx
<div className="space-y-5">
  <div>
    <Skeleton className="mb-2 h-8 w-48 rounded-lg" />
    <Skeleton className="h-4 w-64 rounded-lg" />
  </div>
  <Card className="space-y-4 p-5">
    <Skeleton className="h-4 w-32 rounded" />
    <Skeleton className="h-7 w-48 rounded" />
    <Skeleton className="h-4 w-full rounded" />
  </Card>
</div>
```

## 5. Tables, search, and filters

Use semantic shadcn table components for tabular data. Wrap wide tables in a responsive horizontal scroller when needed. Keep row content aligned, concise, and readable at mobile sizes.

```jsx
<Card className="overflow-hidden">
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border hover:bg-transparent">
          {columns.map((column) => (
            <TableHead key={column.key} className="h-10 px-4 text-[11px] font-bold tracking-wider text-muted-foreground">
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
              لا توجد نتائج
            </TableCell>
          </TableRow>
        ) : rows.map((row) => (
          <TableRow key={row.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/40">
            <TableCell className="px-4 py-3.5 text-xs font-semibold">{row.label}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
</Card>
```

- **Sorting:** use a clear button in the header and expose the current direction accessibly. If a text indicator is used, keep it simple and direction-safe.
- **Row actions:** use concise text actions; do not add icon-only controls.
- **Pagination:** show the visible range and current page, and disable unavailable previous/next actions.
- **Search:** use a labeled or clearly described `Input`; keep its width responsive and avoid relying on placeholder text as its only accessible name.
- **Filters:** use tabs for two or three mutually exclusive options. For larger sets, use an accessible select, popover, or menu from the shared component library instead of a hand-built positioned dropdown.

## 6. Badges and status

Use the shared `Badge` component for short statuses and roles. Keep labels concise, maintain readable contrast in both themes, and use consistent color meanings across the product. Badges should not be the only way status is communicated.

Typical semantic colors:

| Meaning | Light theme | Dark theme |
|---|---|---|
| Success / active | `bg-green-100 text-green-700 border-green-200` | `dark:bg-green-950/40 dark:text-green-400 dark:border-green-800` |
| In progress / warning | `bg-amber-100 text-amber-700 border-amber-200` | `dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800` |
| Error / danger | `bg-red-100 text-red-700 border-red-200` | `dark:bg-red-950/40 dark:text-red-400 dark:border-red-800` |
| Informational | `bg-blue-100 text-blue-700 border-blue-200` | `dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800` |
| Neutral / inactive | `bg-gray-100 text-gray-700 border-gray-200` | `dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-700` |

For compact status pills, use `variant="outline"` with `rounded-full py-0`. Prefer the shared tokens or established status styles already used in the relevant feature.

## 7. Forms

Use the shared form primitives and follow the established `ClientFormDialog` and user-creation patterns. Labels belong above their controls in standalone forms.

| Control | Guidance |
|---|---|
| Text input | Use shadcn `Input`; minimum `h-11` on standalone pages and at least `h-9` in dense layouts |
| Select | Prefer the existing accessible select component; match adjacent control heights |
| Radio group | Use for a small set of mutually exclusive options, especially when each option needs a description |
| Switch | Use the shared `Switch` for binary state and provide an accessible label and helper text when needed |
| Date / file input | Use native controls only where suitable; style to match shared borders, height, and focus treatment |

### 7.1 Standalone create/edit pages

Use `/users/new` as the reference for focused, full-page forms:

- Use a single-column page shell (around `max-w-[520px]`) without a surrounding card or decorative panel.
- Start with a text-only back link, then a clear title and short subtitle.
- Separate fields with generous, consistent vertical spacing. Use full-width controls and visible focus rings.
- Keep page-specific labels, hints, validation messages, and action text together in a constants object to support future translation.
- Use LTR direction on mixed-direction values, such as usernames or passwords, while keeping the page RTL.
- Choose controls based on the data: a vertical radio group for a few described roles, a labeled switch for a binary active state.
- Keep one filled primary submit action and a ghost cancel action. In RTL, place the primary action first in DOM order so it appears on the right. Stack full-width actions on narrow screens.

### 7.2 Validation and submission

- Validate on blur and submit; after an error is shown, revalidate that field on change.
- Connect labels, hints, and errors to their controls. Set `aria-invalid` and `aria-describedby` where relevant and announce validation errors with `role="alert"`.
- Focus the first invalid control after a failed client-side submission.
- Disable duplicate submission while saving and expose the state with `aria-busy`; use concise progress text.
- Show successful completion with the standard toast and navigate only when appropriate.
- Put server-side field errors beside the corresponding field. Do not swallow failures or show success-shaped fallbacks.

## 8. Buttons and interaction states

- Use one clear primary action per section or form. Secondary actions should use the shared outline or ghost variants.
- Keep button labels action-oriented and concise. Ensure hit targets are usable and focus states visible.
- Disabled controls must be visibly disabled and actually non-interactive.
- Use subtle hover states and transitions; avoid unnecessary animation.

```jsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]">
  حفظ
</Button>
<Button variant="ghost">إلغاء</Button>
```

## 9. Dialogs, confirmations, and drawers

Use shared Radix/shadcn primitives for overlays; do not recreate focus management, keyboard handling, or modal behavior by hand.

- **Dialog:** keep it focused on one task. Put the title first, group related fields, and make actions easy to reach on mobile.
- **Destructive confirmation:** state the consequence clearly and name the affected item when possible. Make the destructive action explicit; provide a clear cancel action.
- **Drawer / sheet:** use for contextual details or workflows that benefit from preserving the list behind them. Set RTL direction on the content and make long content scrollable.
- Keep overlay content simple. Use separators and spacing rather than nested cards.

```jsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="right" dir="rtl" className="w-full overflow-y-auto sm:max-w-lg">
    <SheetHeader className="mb-6">
      <SheetTitle className="text-base font-black">تفاصيل العنصر</SheetTitle>
    </SheetHeader>
    <div className="space-y-6 px-6 py-5">
      {/* Related details grouped by section */}
    </div>
  </SheetContent>
</Sheet>
```

## 10. Typography reference

| Context | Typical classes |
|---|---|
| Page title | `text-2xl font-black tracking-tight` |
| Page subtitle | `mt-0.5 text-sm text-muted-foreground` |
| Section/card title | `text-sm font-black` |
| Field label / metric label | `text-xs font-bold text-muted-foreground` |
| Main value | `text-sm font-semibold` |
| KPI value | `text-2xl font-black` |
| Table header | `text-[11px] font-bold tracking-wider text-muted-foreground` |
| Helper text | `text-xs text-muted-foreground` |
| Primary button | `text-xs font-bold` |
| Secondary button | `text-xs font-semibold` |

Treat these as defaults, not rigid requirements. Preserve readable contrast and avoid shrinking important content simply to fit more on screen.

## 11. Avoid

- Icons, SVGs, or emoji used as icons.
- Avatars or decorative images where the page does not need them.
- Gradient backgrounds or decorative visual effects that do not serve hierarchy.
- Overusing cards, nested cards, borders, shadows, badges, or accent colors.
- Physical left/right spacing or alignment utilities in RTL layouts.
- Clickable non-semantic elements, unlabeled controls, icon-only actions, or placeholder-only form labels.
- Bespoke dropdowns or modal behavior when an accessible shared component already exists.
- Hiding errors, swallowing request failures, or allowing repeated submissions while saving.
- Dense layouts that overflow on mobile or break under longer Arabic text.
