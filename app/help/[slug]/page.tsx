import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { HELP_CONTENT } from "./content";
import { PublicNavAuth } from "@/components/layout/public-nav-auth";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return Object.keys(HELP_CONTENT).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: HELP_CONTENT[slug]?.title ?? "Help" };
}

export default async function HelpSubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = HELP_CONTENT[slug];
  if (!page) notFound();

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
          <Link href="/" className="font-serif text-xl font-bold">InvestaLens</Link>
          <div className="flex items-center gap-4">
            <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground">All Help</Link>
            <PublicNavAuth />
          </div>
        </div>
      </nav>

      <main id="main" className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/help"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All Help Topics
        </Link>

        <h1 className="font-serif text-3xl font-bold" style={{ textWrap: "balance" }}>
          {page.title}
        </h1>

        <div className="prose prose-sm mt-8 max-w-none dark:prose-invert">
          {page.sections.map((section, i) => (
            <section key={i} className="mb-8">
              {section.heading && (
                <h2 className="font-serif text-xl font-bold">{section.heading}</h2>
              )}
              <div
                className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_table]:w-full [&_table]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          {page.prev ? (
            <Link href={`/help/${page.prev.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
              &larr; {page.prev.title}
            </Link>
          ) : <span />}
          {page.next ? (
            <Link href={`/help/${page.next.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
              {page.next.title} &rarr;
            </Link>
          ) : <span />}
        </div>
      </main>
    </div>
  );
}
