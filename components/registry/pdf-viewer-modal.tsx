"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Check,
  X,
  Ban,
  Loader2,
  Download,
  Printer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { updateApplicationStatus } from "@/actions/application";
import { UserListItem } from "@/actions/registry";
import { UserStatus } from "@/actions/application-status";
import { fillPdfWorking } from "@/lib/pdf-dynamic-filler";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserListItem | null;
  userStatus: UserStatus | null;
  applicationData: any;
  onStatusUpdate: () => void;
}

export function PdfViewerModal({
  isOpen,
  onClose,
  user,
  userStatus,
  applicationData,
  onStatusUpdate,
}: PdfViewerModalProps) {
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState<string>("");

  // Load and fill PDF when modal opens
  React.useEffect(() => {
    if (isOpen && applicationData && !pdfUrl) {
      fillPdf();
    }
  }, [isOpen, applicationData]);

  // Cleanup PDF URL when modal closes
  React.useEffect(() => {
    if (!isOpen && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [isOpen, pdfUrl]);

  const fillPdf = async () => {
    if (!applicationData) return;

    setPdfLoading(true);
    try {
      // Fetch the PDF template from public folder
      const response = await fetch("/PRPWD-APPLICATION_FORM.pdf");

      if (!response.ok) {
        throw new Error("Failed to fetch PDF template");
      }

      const templateBytes = await response.arrayBuffer();

      console.log("📄 Filling PDF dynamically with data:", applicationData);

      // Fill the PDF dynamically using PDF.js detection
      const filledPdfBytes = await fillPdfWorking(
        templateBytes,
        applicationData,
      );

      // Create blob URL for viewing
      const blob = new Blob([filledPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Add parameters to hide toolbar and navpanes
      const pdfViewerUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
      setPdfUrl(pdfViewerUrl);

      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error("Error filling PDF:", error);
      toast.error("Failed to generate PDF");
      setDebugInfo(JSON.stringify(error, null, 2));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl || !user) return;

    const cleanUrl = pdfUrl.split("#")[0];
    const link = document.createElement("a");
    link.href = cleanUrl;
    link.download = `PWD-Application-${user.user_id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const cleanUrl = pdfUrl.split("#")[0];
    const printWindow = window.open(cleanUrl);
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!applicationData?._id) return;

    setActionLoading(status);
    try {
      const result = await updateApplicationStatus(
        applicationData._id,
        status as any,
      );

      if (result.success) {
        toast.success(`Application ${status} successfully`);
        onStatusUpdate();
        onClose();
      } else {
        toast.error(result.error || `Failed to ${status} application`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  if (!user || !applicationData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-screen h-screen p-0 gap-0 bg-transparent border-0 shadow-none">
        <VisuallyHidden>
          <DialogTitle>PWD Application Form - {user.user_id}</DialogTitle>
        </VisuallyHidden>

        {/* Floating Action Button */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={handlePrint}
                disabled={!pdfUrl || pdfLoading}
                className="text-xs"
              >
                <Printer className="h-3.5 w-3.5 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDownload}
                disabled={!pdfUrl || pdfLoading}
                className="text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Download
              </DropdownMenuItem>
              <div className="h-px bg-gray-200 my-1" />
              <DropdownMenuItem
                onClick={() => handleStatusUpdate("approved")}
                disabled={actionLoading !== null}
                className="text-xs text-green-600"
              >
                {actionLoading === "approved" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-2" />
                )}
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusUpdate("under_review")}
                disabled={actionLoading !== null}
                className="text-xs text-blue-600"
              >
                {actionLoading === "under_review" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-2" />
                )}
                Review
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusUpdate("rejected")}
                disabled={actionLoading !== null}
                className="text-xs text-red-600"
              >
                {actionLoading === "rejected" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5 mr-2" />
                )}
                Reject
              </DropdownMenuItem>
              <div className="h-px bg-gray-200 my-1" />
              <DropdownMenuItem onClick={onClose} className="text-xs">
                <XCircle className="h-3.5 w-3.5 mr-2" />
                Close
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* PDF Viewer */}
        <div className="w-full h-full">
          {pdfLoading ? (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-500">
                  Analyzing PDF and filling form...
                </p>
                {debugInfo && (
                  <pre className="mt-4 text-xs text-left bg-gray-100 p-2 rounded max-w-lg overflow-auto">
                    {debugInfo}
                  </pre>
                )}
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PWD Application Form"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-white">
              <p className="text-sm text-gray-500">Click to view application</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
