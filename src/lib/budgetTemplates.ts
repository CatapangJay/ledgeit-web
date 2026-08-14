// ─── Budget Plan Templates ──────────────────────────────────────────────────────
// Percentage-based starting points for a budget plan. Keys are category ids
// (see CATEGORIES in types). A template need not cover every category —
// unlisted categories simply start at 0%. Each template's percents should sum
// to 100 (verified by a dev-time assertion below).

export interface PlanTemplate {
  label: string
  description: string
  percents: Record<string, number>
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    label: 'Regular Month',
    description: 'Balanced spending across all categories',
    percents: { restaurants: 15, groceries: 20, transport: 10, shopping: 10, utilities: 10, entertainment: 5, health: 5, savings: 10, investments: 8, education: 4, personal_care: 3 },
  },
  {
    label: 'Tight Month',
    description: 'Cut spending to essentials only',
    percents: { restaurants: 8, groceries: 28, transport: 15, shopping: 3, utilities: 18, entertainment: 3, health: 6, savings: 12, investments: 5, education: 1, personal_care: 1 },
  },
  {
    label: 'Savings Mode',
    description: 'Bare minimum — maximise savings this month',
    percents: { restaurants: 6, groceries: 26, transport: 13, shopping: 3, utilities: 16, entertainment: 2, health: 6, savings: 15, investments: 10, education: 2, personal_care: 1 },
  },
  {
    label: 'Vacation Mode',
    description: 'More dining, fun & transport; fewer essentials',
    percents: { restaurants: 22, groceries: 12, transport: 18, shopping: 14, utilities: 6, entertainment: 10, health: 3, savings: 5, investments: 3, education: 2, personal_care: 5 },
  },
  {
    label: 'Family First',
    description: 'Groceries, kids & family support take priority',
    percents: { groceries: 22, family: 12, kids: 12, utilities: 10, transport: 8, restaurants: 8, health: 6, savings: 8, education: 5, church: 5, personal_care: 2, shopping: 2 },
  },
  {
    label: 'Debt Payoff',
    description: 'Trim the extras, funnel the rest to savings',
    percents: { groceries: 24, utilities: 16, savings: 20, transport: 12, health: 6, restaurants: 6, family: 4, church: 3, education: 3, personal_care: 2, shopping: 2, subscriptions: 2 },
  },
  {
    label: 'Student',
    description: 'Allowance-style: school, commute & food',
    percents: { education: 18, restaurants: 18, transport: 15, groceries: 12, entertainment: 10, shopping: 8, subscriptions: 5, personal_care: 5, savings: 5, health: 4 },
  },
  {
    label: 'Freelancer',
    description: 'Buffer for irregular income; tools & taxes',
    percents: { groceries: 16, savings: 15, investments: 12, restaurants: 12, utilities: 10, transport: 8, subscriptions: 8, health: 6, shopping: 5, entertainment: 4, education: 2, personal_care: 2 },
  },
  {
    label: 'Holiday Season',
    description: 'Gifts, gatherings & shopping run higher',
    percents: { gifts: 18, restaurants: 18, shopping: 16, groceries: 12, transport: 8, church: 6, entertainment: 6, family: 6, utilities: 5, savings: 3, personal_care: 2 },
  },
  {
    label: 'Giving & Faith',
    description: 'Prioritise tithes, offerings & support',
    percents: { church: 18, groceries: 18, family: 10, utilities: 10, transport: 8, restaurants: 8, savings: 8, health: 5, gifts: 5, education: 4, personal_care: 3, shopping: 3 },
  },
]

// Dev-time sanity check: every template must allocate exactly 100%.
if (process.env.NODE_ENV !== 'production') {
  for (const t of PLAN_TEMPLATES) {
    const sum = Object.values(t.percents).reduce((s, p) => s + p, 0)
    if (sum !== 100) {
      // eslint-disable-next-line no-console
      console.warn(`[budgetTemplates] "${t.label}" sums to ${sum}%, expected 100%`)
    }
  }
}
