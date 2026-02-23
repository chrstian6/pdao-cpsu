import { getUserByUserId } from "@/actions/registry"; // Updated import
import { getPWDCardByUserId } from "@/actions/pwdcard";
import { PwdApplicationForm } from "@/components/registry/pwd-application-form";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface VerifyPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  // Await the params Promise to get the userId (which is now the user_id in PDAO format)
  const { userId } = await params;

  // Use getUserByUserId instead of getUserById
  const userResult = await getUserByUserId(userId);
  const cardResult = await getPWDCardByUserId(userId);

  if (!userResult.success || !userResult.data) {
    notFound();
  }

  const user = userResult.data;
  const existingCard = cardResult.success ? cardResult.data : null;

  // If user already has a card, redirect or show message
  if (existingCard) {
    return (
      <div className="container mx-auto py-10">
        <Card className="p-8 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-yellow-600 mb-4">
            PWD Card Already Exists
          </h2>
          <p className="text-gray-600 mb-4">
            This user already has a PWD card. You can view or manage it from the
            registry.
          </p>
          <Button asChild>
            <a href="/dashboard/registry">Back to Registry</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <PwdApplicationForm user={user} />
      </div>
    </div>
  );
}
