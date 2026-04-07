import {
  ForkKnife,
  ShoppingCart,
  Car,
  Bag,
  Lightning,
  GameController,
  Heartbeat,
  ArrowFatLineDown,
  DotsThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

/**
 * Maps CATEGORIES[n].icon string values to their Phosphor React components.
 * Used by CategoryBadge and any component that renders a category icon dynamically.
 */
export const PHOSPHOR_ICON_MAP: Record<string, Icon> = {
  ForkKnife,
  ShoppingCart,
  Car,
  Bag,
  Lightning,
  GameController,
  Heartbeat,
  ArrowFatLineDown,
  DotsThree,
}
