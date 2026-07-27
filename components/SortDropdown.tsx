// components/SortDropdown.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type SortOption = { value: string; label: string }

export default function SortDropdown({
  options,
  selected,
  onSelect,
  compact = false,
}: {
  options: SortOption[]
  selected: string
  onSelect: (value: string) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = options.find((o) => o.value === selected)?.label ?? ''

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 border border-gray-200 bg-white rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
      >
        {compact ? (
          'Ordenar'
        ) : (
          <>
            Ordenar por: <span className="text-gray-900">{selectedLabel}</span>
          </>
        )}
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
          {options.map((option) => {
            const active = option.value === selected
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  active ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
