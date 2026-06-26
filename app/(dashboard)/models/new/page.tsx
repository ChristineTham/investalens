import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ModelForm } from "@/app/(dashboard)/models/_components/model-form";

export default async function NewModelPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <ModelForm mode="create" />;
}
