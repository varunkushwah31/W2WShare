import React from 'react'
import { Check } from '@phosphor-icons/react'

export interface FeatureSplitPanelProps {
  eyebrow?: string
  heading: string
  description: string
  items: string[]
  illustration: React.ReactNode
  reverse?: boolean
  id?: string
}

export const FeatureSplitPanel: React.FC<FeatureSplitPanelProps> = ({
  eyebrow,
  heading,
  description,
  items,
  illustration,
  reverse = false,
  id,
}) => {
  return (
    <div
      id={id}
      className="w-full max-w-[1200px] mx-auto px-6 py-16 md:py-24 dashed-container my-12 rounded-2xl bg-[#000000]/60"
    >
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
          reverse ? 'lg:flex-row-reverse' : ''
        }`}
      >
        {/* Text Content Column */}
        <div className={`space-y-6 ${reverse ? 'lg:order-2' : 'lg:order-1'}`}>
          {eyebrow && (
            <div className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-[#808080]">
              {eyebrow}
            </div>
          )}

          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
            {heading}
          </h3>

          <p className="text-base text-[#ababab] leading-relaxed max-w-lg">
            {description}
          </p>

          {/* Checklist with Periwinkle #7089ba checkmarks */}
          <ul className="space-y-3.5 pt-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-white">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[#7089ba]">
                  <Check className="w-4 h-4" weight="bold" />
                </div>
                <span className="leading-snug text-[#ffffff] font-normal">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CAD Illustration Column */}
        <div
          className={`flex justify-center items-center ${
            reverse ? 'lg:order-1' : 'lg:order-2'
          }`}
        >
          {illustration}
        </div>
      </div>
    </div>
  )
}
