import { ReactNode } from "react"

/**
 * The artwork is built from theme tokens rather than TMDB posters: these
 * screens render before there is a session to fetch anything with, and a grid
 * of placeholder tiles reads as a stuck loading state.
 */
function CinematicPanel() {
  return (
    <div className="relative overflow-hidden bg-[hsl(228_14%_7%)] lg:min-h-screen">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 15% 5%, hsl(158 38% 22% / 0.85) 0%, transparent 55%)," +
            "radial-gradient(90% 70% at 95% 100%, hsl(158 35% 40% / 0.35) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.13] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent 0 26px, hsl(60 10% 95% / 0.5) 26px 27px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, hsl(228 14% 7%) 0%, transparent 45%)",
        }}
      />

      {/* On phones this is a brand band above the form, not a second screen to
          scroll past — so the display type shrinks and the supporting copy goes. */}
      <div className="relative flex h-full flex-col justify-between gap-4 px-6 py-8 lg:gap-10 lg:px-14 lg:py-16">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(158_35%_66%)]">
          Showtracker
        </div>
        <div>
          <p className="font-serif italic font-normal leading-[0.9] tracking-[-0.03em] text-[hsl(60_10%_95%)] text-[30px] lg:text-[92px]">
            Every episode,
            <br />
            accounted for.
          </p>
          <p className="mt-6 hidden max-w-sm font-sans text-[15px] leading-relaxed text-[hsl(60_10%_95%_/_0.62)] lg:block">
            Your library, your progress, and what airs next — across every
            device you watch on.
          </p>
        </div>
        <div className="hidden font-mono text-[11px] tracking-[0.08em] text-[hsl(60_10%_95%_/_0.38)] lg:block">
          Powered by TMDB
        </div>
      </div>
    </div>
  )
}

export function AuthLayout({
  eyebrow,
  heading,
  blurb,
  children,
}: {
  eyebrow: string
  /** Newlines are honoured, so the display type can be broken deliberately. */
  heading: string
  blurb: string
  children: ReactNode
}) {
  return (
    // The panel comes first in the DOM so it lands above the form on phones,
    // where `order` does nothing outside the grid; on desktop it moves right.
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1fr_1.05fr]">
      <div className="lg:order-2">
        <CinematicPanel />
      </div>

      <div className="flex items-center justify-center px-6 py-12 lg:order-1 lg:px-14">
        <div className="w-full max-w-[400px]">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
          <h1 className="mt-3 whitespace-pre-line font-serif font-normal text-[44px] leading-[0.95] tracking-[-0.025em] text-foreground">
            {heading}
          </h1>
          <p className="mt-4 font-sans text-[14px] leading-relaxed text-muted-foreground">
            {blurb}
          </p>
          {children}
        </div>
      </div>
    </div>
  )
}
