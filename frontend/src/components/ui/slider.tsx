import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#242424] border border-[#2e2e2e]">
      <SliderPrimitive.Range className="absolute h-full bg-[#7089ba]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-white bg-black ring-offset-black transition-all hover:scale-115 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7089ba] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing hover:border-[#7089ba]" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
