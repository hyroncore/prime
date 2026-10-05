import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TabKey, WorkflowCounts } from './workflowTypes'
import { TABS } from './workflowTypes'

interface WorkflowTabsProps {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
  counts: WorkflowCounts | null
}

export function WorkflowTabs({ activeTab, onChange, counts }: WorkflowTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onChange(value as TabKey)}
      dir="rtl"
    >
      <TabsList
        aria-label="تصفية الطلبات حسب مرحلة سير العمل"
        className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1"
      >
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className="min-h-11 gap-2 whitespace-normal px-2 text-xs font-semibold data-[state=active]:text-foreground sm:text-sm"
          >
            <span>{tab.label}</span>
            {counts && (
              <span className="min-w-6 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                {counts[tab.key]}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
