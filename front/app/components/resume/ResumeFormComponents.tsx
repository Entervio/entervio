import React from "react"
import { Plus } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Textarea } from "~/components/ui/textarea"
import { Input } from "~/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "~/components/ui/calendar"
import { format, parse, isValid } from "date-fns"
import { cn } from "~/lib/utils"

/**
 * Section Wrapper
 * Standardizes the header, icon, and "Add" button for each resume category
 */
interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  onAdd: () => void
}

export function Section({ title, icon, children, onAdd }: SectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-3 text-lg font-bold text-foreground">
          <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-700">
            {icon}
          </div>
          {title}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAdd} 
          className="gap-2 h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>
      <div className="space-y-4 pt-2">
        {children}
      </div>
    </div>
  )
}

/**
 * Auto-Resizing Textarea
 * Prevents awkward scrollbars inside the resume cards
 */
export function AutoResizeTextarea({ 
  value, 
  onChange, 
  placeholder, 
  className 
}: { 
  value: string | null, 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, 
  placeholder?: string, 
  className?: string 
}) {
  return (
    <Textarea
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className={cn("min-h-[80px] resize-y text-sm border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500", className)}
    />
  )
}

/**
 * DatePicker
 * Handles both manual typing and calendar selection
 */
export function DatePicker({ 
  value, 
  onChange, 
  placeholder = "June 01, 2025" 
}: { 
  value: string | undefined, 
  onChange: (date: string) => void, 
  placeholder?: string 
}) {
  const [open, setOpen] = React.useState(false)

  // Parse "yyyy-MM-dd" or "yyyy-MM" into a Date object
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    const d = parse(value, 'yyyy-MM-dd', new Date())
    return isValid(d) ? d : undefined
  }, [value])

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      onChange(format(newDate, "yyyy-MM-dd"))
      setOpen(false)
    } else {
      onChange("")
    }
  }

  return (
    <div className="relative flex gap-2 w-full">
      <Input
        value={dateValue ? format(dateValue, "MMMM dd, yyyy") : ""}
        readOnly
        placeholder={placeholder}
        className="bg-background pr-10 border border-border/50 shadow-none"
        onClick={() => setOpen(true)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="absolute top-1/2 right-2 size-6 -translate-y-1/2 p-0 h-6 w-6"
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}