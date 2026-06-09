import { Providers } from "@/lib/providers/session-provider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-6 p-6">{children}</div>
      </div>
    </Providers>
  );
}
