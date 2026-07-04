import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Tag, Tags, FolderTree, Download, Key, Calculator, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Account</h2>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{user?.name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member since</p>
            <p className="font-medium">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-AU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Unknown"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/settings/groups"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <FolderTree className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-medium">Custom Groups</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Organise instruments into groups
          </p>
        </Link>
        <Link
          href="/settings/labels"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <Tag className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-medium">Labels</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tag and filter holdings
          </p>
        </Link>
        <Link
          href="/settings/categories"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <Tags className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-medium">Categories</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage cash transaction categories
          </p>
        </Link>
        <Link
          href="/settings/sharing"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <Users className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-medium">Sharing</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Share portfolios with others
          </p>
        </Link>
        <Link
          href="/settings/export"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <Download className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-medium">Export</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Download your data
          </p>
        </Link>
        <Link
          href="/settings/api-tokens"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <Key className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-medium">API Tokens</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage API access
          </p>
        </Link>
        <Link
          href="/settings/portfolio"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-medium">Tax &amp; CGT</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Entity type, allocation &amp; 2027 regime settings
          </p>
        </Link>
        <Link
          href="/settings/instruments"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <Scale className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-medium">Instrument Tax</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            CGT vs income treatment per instrument
          </p>
        </Link>
      </div>
    </div>
  );
}
