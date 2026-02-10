// app/dashboard/page.tsx
import { validateSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  // Server-side auth check using server action
  const { isValid, user } = await validateSession();

  if (!isValid) {
    redirect("/");
  }

  // Pass user data to client component
  return <DashboardClient user={user!} />;
}
