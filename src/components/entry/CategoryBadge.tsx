'use client'

import { PHOSPHOR_ICON_MAP } from '@/lib/iconMap'
import type { Category } from '@/types'

interface Props {
  category: Category
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { icon: 11, cls: 'px-2 py-0.5 text-[11px] gap-1' },
  md: { icon: 13, cls: 'px-2.5 py-1 text-xs gap-1.5' },
  lg: { icon: 16, cls: 'px-3 py-1.5 text-sm gap-2' },
}

export default function CategoryBadge({ category, size = 'md' }: Props) {
  const Icon = PHOSPHOR_ICON_MAP[category.icon]
  const s = SIZES[size]

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${s.cls} ${category.bgColor} ${category.color}`}
    >
      {Icon && <Icon size={s.icon} weight="fill" aria-hidden="true" />}
      {category.label}
    </span>
  )
}
