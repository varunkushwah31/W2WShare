import * as React from "react"
import { PlusIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface AccordionContextType {
  value: string | string[] | undefined
  onItemToggle: (itemValue: string) => void
  type: "single" | "multiple"
  collapsible?: boolean
}

const AccordionContext = React.createContext<AccordionContextType | null>(null)

interface AccordionItemContextType {
  value: string
  isOpen: boolean
  triggerId: string
  contentId: string
}

const AccordionItemContext = React.createContext<AccordionItemContextType | null>(null)

export interface AccordionSingleProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single"
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  collapsible?: boolean
}

export interface AccordionMultipleProps extends React.HTMLAttributes<HTMLDivElement> {
  type: "multiple"
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  collapsible?: boolean
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = "single",
      value: controlledValue,
      defaultValue,
      onValueChange,
      collapsible = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState<
      string | string[] | undefined
    >(defaultValue)

    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : uncontrolledValue

    const handleItemToggle = React.useCallback(
      (itemValue: string) => {
        if (type === "single") {
          const currentSingle = currentValue as string | undefined
          let nextValue: string | undefined
          if (currentSingle === itemValue) {
            nextValue = collapsible ? "" : itemValue
          } else {
            nextValue = itemValue
          }
          if (!isControlled) {
            setUncontrolledValue(nextValue)
          }
          ;(onValueChange as ((val: string) => void) | undefined)?.(nextValue || "")
        } else {
          const currentList = Array.isArray(currentValue) ? currentValue : []
          let nextList: string[]
          if (currentList.includes(itemValue)) {
            nextList = currentList.filter((v) => v !== itemValue)
          } else {
            nextList = [...currentList, itemValue]
          }
          if (!isControlled) {
            setUncontrolledValue(nextList)
          }
          ;(onValueChange as ((val: string[]) => void) | undefined)?.(nextList)
        }
      },
      [collapsible, currentValue, isControlled, onValueChange, setUncontrolledValue, type]
    )

    const contextValue = React.useMemo(
      () => ({
        value: currentValue,
        onItemToggle: handleItemToggle,
        type,
        collapsible,
      }),
      [collapsible, currentValue, handleItemToggle, type]
    )

    return (
      <AccordionContext.Provider value={contextValue}>
        <div ref={ref} className={cn("w-full divide-y divide-carbon", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children, ...props }, ref) => {
    const accordionContext = React.useContext(AccordionContext)
    const uniqueId = React.useId()
    const triggerId = `accordion-trigger-${uniqueId}`
    const contentId = `accordion-content-${uniqueId}`

    const isOpen = React.useMemo(() => {
      if (!accordionContext?.value) return false
      if (Array.isArray(accordionContext.value)) {
        return accordionContext.value.includes(value)
      }
      return accordionContext.value === value
    }, [accordionContext?.value, value])

    const itemContextValue = React.useMemo(
      () => ({ value, isOpen, triggerId, contentId }),
      [contentId, isOpen, triggerId, value]
    )

    return (
      <AccordionItemContext.Provider value={itemContextValue}>
        <div
          ref={ref}
          data-state={isOpen ? "open" : "closed"}
          className={cn(
            "border-b border-carbon transition-colors duration-150",
            isOpen && "border-[#7089ba]/35",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  iconClassName?: string
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, iconClassName, ...props }, ref) => {
    const accordion = React.useContext(AccordionContext)
    const item = React.useContext(AccordionItemContext)

    if (!item) {
      throw new Error("AccordionTrigger must be used within an AccordionItem")
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      accordion?.onItemToggle(item.value)
      props.onClick?.(e)
    }

    return (
      <h3 className="flex">
        <button
          ref={ref}
          type="button"
          id={item.triggerId}
          aria-expanded={item.isOpen}
          aria-controls={item.contentId}
          data-state={item.isOpen ? "open" : "closed"}
          onClick={handleClick}
          className={cn(
            "group flex flex-1 items-center justify-between py-5 text-left text-[16px] font-medium text-white transition-colors duration-150 hover:text-white/90 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7089ba]",
            className
          )}
          {...props}
        >
          <span className="flex-1 pr-4">{children}</span>
          <div
            className={cn(
              "ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
              item.isOpen
                ? "bg-[#7089ba]/15 border-[#7089ba]/40 text-[#7089ba] shadow-[0_0_8px_rgba(112,137,186,0.25)]"
                : "bg-carbon border-[#2a2a2a] text-steel group-hover:text-white group-hover:border-[#7089ba]/30",
              iconClassName
            )}
          >
            <PlusIcon
              className={cn(
                "h-4 w-4 transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]",
                item.isOpen && "rotate-45"
              )}
              weight="bold"
            />
          </div>
        </button>
      </h3>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

type AccordionContentProps = React.HTMLAttributes<HTMLElement>

const AccordionContent = React.forwardRef<HTMLElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const item = React.useContext(AccordionItemContext)

    if (!item) {
      throw new Error("AccordionContent must be used within an AccordionItem")
    }

    return (
      <section
        ref={ref}
        id={item.contentId}
        aria-labelledby={item.triggerId}
        data-state={item.isOpen ? "open" : "closed"}
        style={{
          gridTemplateRows: item.isOpen ? "1fr" : "0fr",
        }}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]",
          item.isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        {...props}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={cn("pt-0 pb-5 text-sm text-ash leading-relaxed", className)}>
            {children}
          </div>
        </div>
      </section>
    )
  }
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

