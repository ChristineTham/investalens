import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicNavAuth } from "@/components/layout/public-nav-auth";

export const metadata = {
  title: "Privacy",
};

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to Main Content
      </a>

      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="h-7 w-7" aria-hidden="true">
              <circle cx="14" cy="14" r="10" stroke="#85677b" strokeWidth="2.5" fill="#f4eee8"/>
              <polyline points="8,18 11,15 14,16 18,10" stroke="#b565a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <line x1="21.5" y1="21.5" x2="29" y2="29" stroke="#85677b" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="18" cy="10" r="1.5" fill="#64bfa4"/>
            </svg>
            InvestaLens
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
            <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground">Help</Link>
            <PublicNavAuth />
          </div>
        </div>
      </nav>

      <main id="main" className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>

        <h1 className="font-serif text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">

          <section>
            <h2>1. Who We Are</h2>
            <p className="mt-3">
              InvestaLens is an open-source portfolio tracker and analytics tool
              created by{" "}
              <a
                href="https://hellotham.com"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hello Tham Pty Ltd
              </a>
              , a boutique management consulting firm based in Australia.
              When we say &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;, we mean
              Hello Tham Pty Ltd as the operators of this InvestaLens instance.
            </p>
          </section>

          <section>
            <h2>2. What Data We Collect</h2>
            <h3>Account Data</h3>
            <ul>
              <li>Name, email address, and hashed password (or Google OAuth profile)</li>
              <li>Session tokens for authentication</li>
            </ul>
            <h3>Portfolio Data</h3>
            <ul>
              <li>Holdings, transactions, instruments, and prices you add or import</li>
              <li>Portfolio settings (tax residency, currency, allocation method)</li>
              <li>Custom groups, labels, and watchlist entries</li>
            </ul>
            <h3>Usage Data</h3>
            <ul>
              <li>We do <strong>not</strong> use third-party analytics or tracking cookies</li>
              <li>Server logs may contain IP addresses and timestamps (retained for 30&nbsp;days for security)</li>
            </ul>
          </section>

          <section>
            <h2>3. Legal Basis for Processing (GDPR Art.&nbsp;6)</h2>
            <ul>
              <li><strong>Contract</strong> &mdash; Processing your portfolio data is necessary to provide the service you signed up for</li>
              <li><strong>Legitimate interest</strong> &mdash; Security logging to protect accounts from unauthorised access</li>
              <li><strong>Consent</strong> &mdash; Optional AI features (if enabled) send data to Google Gemini; you can opt out by not using those features</li>
            </ul>
          </section>

          <section>
            <h2>4. How We Use Your Data</h2>
            <ul>
              <li>Authenticate you and maintain your session</li>
              <li>Store and display your portfolio holdings and transactions</li>
              <li>Calculate performance, tax reports, and analytics</li>
              <li>Fetch market prices from Yahoo Finance on your behalf</li>
              <li>If you use AI features: send document content to Google Gemini for parsing (not stored by us beyond the request)</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Sharing &amp; Third Parties</h2>
            <p className="mt-3">We share data only with:</p>
            <ul>
              <li><strong>Database provider</strong> (Neon) &mdash; Stores your portfolio data (encrypted at rest)</li>
              <li><strong>Hosting provider</strong> (Vercel) &mdash; Serves the application</li>
              <li><strong>Yahoo Finance</strong> &mdash; We send instrument codes to fetch prices (no personal data sent)</li>
              <li><strong>Google Gemini</strong> &mdash; Only if you use AI Import or AI Chat (document content sent for parsing)</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell, rent, or share your personal data with advertisers or data brokers.</p>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <ul>
              <li><strong>Account &amp; portfolio data</strong> &mdash; Retained until you delete your account</li>
              <li><strong>Server logs</strong> &mdash; Retained for 30&nbsp;days</li>
              <li><strong>Cached market data</strong> &mdash; Retained indefinitely (public data, not personal)</li>
            </ul>
          </section>

          <section>
            <h2>7. Your Rights (GDPR)</h2>
            <p className="mt-3">If you are in the EU/EEA/UK, you have the right to:</p>
            <ul>
              <li><strong>Access</strong> &mdash; Export all your data via Settings &rarr; Export (JSON backup)</li>
              <li><strong>Rectification</strong> &mdash; Edit any personal data in your account settings</li>
              <li><strong>Erasure</strong> &mdash; Delete your account and all associated data</li>
              <li><strong>Portability</strong> &mdash; Export your data in standard formats (CSV, JSON)</li>
              <li><strong>Restriction</strong> &mdash; Contact us to restrict processing</li>
              <li><strong>Object</strong> &mdash; Withdraw consent for optional processing at any time</li>
            </ul>
            <p className="mt-3">To exercise these rights, use the in-app export/delete features or contact the instance operator.</p>
          </section>

          <section>
            <h2>8. Data Security</h2>
            <ul>
              <li>Passwords are hashed with bcrypt (cost factor 12)</li>
              <li>All connections use TLS/HTTPS</li>
              <li>Database encrypted at rest (Neon)</li>
              <li>API tokens are stored as SHA-256 hashes</li>
              <li>Session tokens are short-lived JWTs</li>
            </ul>
          </section>

          <section>
            <h2>9. Cookies</h2>
            <p className="mt-3">
              We use only <strong>essential cookies</strong> required for authentication
              (session token). We do not use analytics, advertising, or tracking cookies.
              No cookie consent banner is required as we only use strictly necessary cookies
              (GDPR Recital&nbsp;30, ePrivacy Directive Art.&nbsp;5(3) exemption).
            </p>
          </section>

          <section>
            <h2>10. International Transfers</h2>
            <p className="mt-3">
              Your data may be processed in regions where Vercel and Neon operate
              (primarily US). These providers maintain appropriate safeguards including
              Standard Contractual Clauses (SCCs) for EU data transfers.
            </p>
          </section>

          <section>
            <h2>11. Children</h2>
            <p className="mt-3">
              InvestaLens is not intended for users under 16. We do not knowingly collect
              data from children.
            </p>
          </section>

          <section>
            <h2>12. Changes to This Policy</h2>
            <p className="mt-3">
              We may update this policy occasionally. Material changes will be noted
              with a revised &ldquo;Last updated&rdquo; date. Continued use after changes
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2>13. Contact</h2>
            <p className="mt-3">
              For privacy concerns, data requests, or questions about this policy, contact
              the operator of this InvestaLens instance or open an issue on the{" "}
              <a
                href="https://github.com/ChristineTham/investalens"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repository
              </a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} InvestaLens &middot; Created by{" "}
            <a
              href="https://hellotham.com"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hello Tham
            </a>
          </p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/help" className="hover:text-foreground">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
