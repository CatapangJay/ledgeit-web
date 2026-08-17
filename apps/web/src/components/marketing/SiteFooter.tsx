import Link from 'next/link'

// ─── Elaborate marketing footer (neutral dark) ────────────────────────────────
// Deliberately neutral-dark rather than forest green: it anchors the page bottom
// without competing with the green brand surfaces above it.

const FOOTER_COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Features',     href: '/#features' },
      { label: 'Sharing',      href: '/#households' },
      { label: 'Sign up free', href: '/login' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',   href: '/about' },
      { label: 'Contact', href: 'mailto:hello@ledgeit.app' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use',   href: '/terms' },
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer style={{ background: '#14181a', color: 'rgba(255,255,255,0.72)' }}>
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">

          {/* Brand block */}
          <div className="max-w-xs">
            <span className="font-mono text-[17px] font-bold tracking-tight" style={{ color: '#ffffff' }}>
              LedgeIt
            </span>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              The fastest way to track your spending. Type it the way you&apos;d say it — done in seconds.
            </p>
            <p className="mt-5 text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Spent it? LedgeIt.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:gap-16">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {col.heading}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:underline"
                        style={{ color: 'rgba(255,255,255,0.62)' }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-14 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.42)' }}>
            © 2026 LedgeIt. Made for the way Filipinos spend.
          </span>
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.42)' }}>
            Made with care in the Philippines
          </span>
        </div>
      </div>
    </footer>
  )
}
