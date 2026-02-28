// app/dashboard/face/page.tsx
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession } from "@/actions/auth";
import FaceVerification from "@/components/face/FaceVerification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default async function FacePage() {
  // Validate session server-side
  const { isValid } = await validateSession();

  if (!isValid) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Face Verification Test
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Test page for PWD ID verification using face recognition and OCR
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Testing Note:</strong> This is a test page for admin use.
            The face verification is simulated with random matching. In
            production, it will use actual face recognition algorithms.
            Tesseract OCR will extract text from ID images.
          </AlertDescription>
        </Alert>

        {/* Face Verification Component */}
        <Suspense fallback={<div>Loading verification system...</div>}>
          <FaceVerification />
        </Suspense>

        {/* Instructions */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">How to Use:</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
            <li>
              <strong>Upload Method:</strong> Upload a clear image of the PWD ID
              card. Tesseract OCR will automatically extract data like name,
              card ID, and date of birth.
            </li>
            <li>
              <strong>Camera Method:</strong> Use your camera to take a live
              photo for face capture.
            </li>
            <li>
              <strong>Face Image:</strong> Upload or capture a clear photo of
              the person's face.
            </li>
            <li>
              <strong>Card ID:</strong> The extracted ID will auto-fill, but you
              can manually enter or correct it (format: 06-4511-000-0000000).
            </li>
            <li>
              <strong>Verification:</strong> Click "Verify Face" to compare the
              face with the ID data. The system will detect faces and provide a
              match score.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
