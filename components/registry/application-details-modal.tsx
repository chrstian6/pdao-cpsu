"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { toast } from "sonner";
import { updateApplicationStatus } from "@/actions/application";
import { UserListItem } from "@/actions/registry";
import { UserStatus } from "@/actions/application-status";

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserListItem | null;
  userStatus: UserStatus | null;
  applicationData: any;
  onStatusUpdate: () => void;
}

export function ApplicationDetailsModal({
  isOpen,
  onClose,
  user,
  userStatus,
  applicationData,
  onStatusUpdate,
}: ApplicationDetailsModalProps) {
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  if (!user || !applicationData) return null;

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable version
    const printContent = document.getElementById(
      "application-form-content",
    )?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>PWD Application Form - ${user.user_id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; margin: 0; }
              .border { border: 1px solid #000; }
              .border-b { border-bottom: 1px solid #000; }
              .p-4 { padding: 1rem; }
              .mb-3 { margin-bottom: 0.75rem; }
              .pb-2 { padding-bottom: 0.5rem; }
              .font-bold { font-weight: 700; }
              .text-lg { font-size: 1.125rem; }
              .text-sm { font-size: 0.875rem; }
              .text-xs { font-size: 0.75rem; }
              .uppercase { text-transform: uppercase; }
              .font-medium { font-weight: 500; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
              .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
              .gap-4 { gap: 1rem; }
              .gap-2 { gap: 0.5rem; }
              .space-y-4 > * + * { margin-top: 1rem; }
              .space-y-6 > * + * { margin-top: 1.5rem; }
              .mt-4 { margin-top: 1rem; }
              .mt-1 { margin-top: 0.25rem; }
              .mb-1 { margin-bottom: 0.25rem; }
              .mr-1 { margin-right: 0.25rem; }
              .p-3 { padding: 0.75rem; }
              .w-4 { width: 1rem; }
              .h-4 { height: 1rem; }
              .border { border: 1px solid #000; }
              .rounded { border-radius: 0; }
              .flex { display: flex; }
              .items-center { align-items: center; }
              .gap-6 { gap: 1.5rem; }
              .justify-between { justify-content: space-between; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .max-w-4xl { max-width: 56rem; }
              .mx-auto { margin-left: auto; margin-right: auto; }
              .bg-green-600 { background-color: #000; }
              .text-white { color: #000; }
              .border-gray-300 { border-color: #000; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="max-w-4xl mx-auto">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatDate = (date: string | Date) => {
    if (!date) return "";
    return format(new Date(date), "MMMM dd, yyyy");
  };

  // Helper function to safely get family background data (handles both old and new formats)
  const getFamilyMemberName = (member: "father" | "mother" | "guardian") => {
    const familyBg = applicationData.familyBackground;
    if (!familyBg) return { lastName: "", firstName: "", middleName: "" };

    // Check if using new nested structure
    if (familyBg[member] && typeof familyBg[member] === "object") {
      return {
        lastName: familyBg[member]?.lastName || "",
        firstName: familyBg[member]?.firstName || "",
        middleName: familyBg[member]?.middleName || "",
      };
    }

    // Handle old string format (backward compatibility)
    const oldField =
      member === "father"
        ? "fatherName"
        : member === "mother"
          ? "motherName"
          : "guardianName";

    if (familyBg[oldField]) {
      return {
        lastName: familyBg[oldField] || "",
        firstName: "",
        middleName: "",
      };
    }

    return { lastName: "", firstName: "", middleName: "" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 gap-0 bg-transparent border-0 shadow-none">
        {/* Floating Action Button - Minimal */}
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
              <DropdownMenuItem onClick={handlePrint} className="text-xs">
                <Printer className="h-3.5 w-3.5 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload} className="text-xs">
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

        {/* Pure Form Content - No Backgrounds, No Headers, No Footers */}
        <div
          id="application-form-content"
          className="h-full overflow-y-auto bg-white"
        >
          <div className="max-w-5xl mx-auto py-12 px-8">
            {/* Republic Header */}
            <div className="text-center mb-8">
              <div className="text-xs mb-1">Republic of the Philippines</div>
              <div className="text-xl font-bold tracking-wide">
                PWD APPLICATION FORM
              </div>
            </div>

            {/* Control Number and Date */}
            <div className="flex justify-between text-xs border-b border-black pb-1 mb-6">
              <div>
                Control No.: {applicationData.controlNo || "______________"}
              </div>
              <div>Date Applied: {formatDate(applicationData.dateApplied)}</div>
            </div>

            {/* Application Type */}
            <div className="mb-6">
              <div className="flex gap-8 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border border-black">
                    {applicationData.applicationType?.isNewApplicant && (
                      <span className="block w-2 h-2 bg-black mx-auto mt-[2px]"></span>
                    )}
                  </span>
                  <span>NEW APPLICANT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border border-black">
                    {applicationData.applicationType?.isRenewal && (
                      <span className="block w-2 h-2 bg-black mx-auto mt-[2px]"></span>
                    )}
                  </span>
                  <span>RENEWAL</span>
                </div>
              </div>
            </div>

            {/* I. PERSONAL INFORMATION */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                I. PERSONAL INFORMATION
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <span className="text-gray-600">Last Name:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.personalInfo?.lastName}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">First Name:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.personalInfo?.firstName}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Middle Name:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.personalInfo?.middleName || ""}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Suffix:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.personalInfo?.suffix || ""}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Date of Birth:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5">
                    {formatDate(applicationData.personalInfo?.dateOfBirth)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Sex:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.personalInfo?.sex}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Civil Status:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.personalInfo?.civilStatus}
                  </div>
                </div>
              </div>
            </div>

            {/* II. DISABILITY INFORMATION */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                II. DISABILITY INFORMATION
              </div>
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="text-gray-600">Type of Disability:</span>
                  <div className="mt-1 min-h-[60px] border-b border-gray-300 pb-1">
                    {applicationData.disabilityInfo?.types?.map(
                      (type: string, i: number) => (
                        <div key={i} className="inline-block mr-3">
                          • {type}
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Cause of Disability:</span>
                  <div className="mt-1 min-h-[60px] border-b border-gray-300 pb-1">
                    {applicationData.disabilityInfo?.causes?.map(
                      (cause: string, i: number) => (
                        <div key={i} className="inline-block mr-3">
                          • {cause}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* III. ADDRESS */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                III. ADDRESS
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div className="col-span-2">
                  <span className="text-gray-600">House No. and Street:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.address?.houseNoStreet}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Barangay:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.address?.barangay}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Municipality:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.address?.municipality}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Province:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.address?.province}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Region:</span>
                  <div className="font-medium border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.address?.region}
                  </div>
                </div>
              </div>
            </div>

            {/* IV. CONTACT DETAILS */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                IV. CONTACT DETAILS
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <span className="text-gray-600">Landline No.:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.contactDetails?.landlineNo || ""}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Mobile No.:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.contactDetails?.mobileNo || ""}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Email Address:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.contactDetails?.emailAddress || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* V. EDUCATION AND EMPLOYMENT */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                V. EDUCATION AND EMPLOYMENT
              </div>
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="text-gray-600">Educational Attainment:</span>
                  <div className="mt-1 min-h-[60px] border-b border-gray-300 pb-1">
                    {applicationData.educationalAttainment?.map(
                      (edu: string, i: number) => (
                        <div key={i} className="inline-block mr-3">
                          • {edu}
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Employment Status:</span>
                  <div className="mt-1 min-h-[60px] border-b border-gray-300 pb-1">
                    {applicationData.employmentStatus?.map(
                      (stat: string, i: number) => (
                        <div key={i} className="inline-block mr-3">
                          • {stat}
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Occupation:</span>
                  <div className="mt-1 min-h-[60px] border-b border-gray-300 pb-1">
                    {applicationData.occupation?.types?.map(
                      (occ: string, i: number) => (
                        <div key={i} className="inline-block mr-3">
                          • {occ}
                        </div>
                      ),
                    )}
                    {applicationData.occupation?.otherSpecify && (
                      <div className="mt-1">
                        Other: {applicationData.occupation.otherSpecify}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Employment Category:</span>
                  <div className="mt-1 min-h-[60px] border-b border-gray-300 pb-1">
                    {applicationData.employmentCategory?.map(
                      (cat: string, i: number) => (
                        <div key={i} className="inline-block mr-3">
                          • {cat}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* VI. ORGANIZATION AFFILIATION */}
            {applicationData.organizationInfo &&
              applicationData.organizationInfo.length > 0 && (
                <div className="mb-6">
                  <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                    VI. ORGANIZATION AFFILIATION
                  </div>
                  {applicationData.organizationInfo.map(
                    (org: any, idx: number) => (
                      <div key={idx} className="text-xs mb-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-600">Organization:</span>
                            <div className="border-b border-gray-300 mt-1 pb-0.5">
                              {org.organizationAffiliated}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Contact Person:
                            </span>
                            <div className="border-b border-gray-300 mt-1 pb-0.5">
                              {org.contactPerson}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">
                              Office Address:
                            </span>
                            <div className="border-b border-gray-300 mt-1 pb-0.5">
                              {org.officeAddress}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Tel No.:</span>
                            <div className="border-b border-gray-300 mt-1 pb-0.5">
                              {org.telNos}
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

            {/* VII. ID REFERENCES */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                VII. ID REFERENCES
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <span className="text-gray-600">SSS No.:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.idReferences?.sssNo || ""}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">PAG-IBIG No.:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.idReferences?.pagIbigNo || ""}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">PSN No.:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.idReferences?.psnNo || ""}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">PhilHealth No.:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.idReferences?.philHealthNo || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* VIII. FAMILY BACKGROUND */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                VIII. FAMILY BACKGROUND
              </div>
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-gray-600">Father's Name:</span>
                  <div className="grid grid-cols-3 gap-4 mt-1">
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("father").lastName}
                    </div>
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("father").firstName}
                    </div>
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("father").middleName}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Mother's Name:</span>
                  <div className="grid grid-cols-3 gap-4 mt-1">
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("mother").lastName}
                    </div>
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("mother").firstName}
                    </div>
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("mother").middleName}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Guardian's Name:</span>
                  <div className="grid grid-cols-3 gap-4 mt-1">
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("guardian").lastName}
                    </div>
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("guardian").firstName}
                    </div>
                    <div className="border-b border-gray-300 pb-0.5 uppercase">
                      {getFamilyMemberName("guardian").middleName}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* IX. ACCOMPLISHED BY */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                IX. ACCOMPLISHED BY
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5">
                    {applicationData.accomplishedBy?.type}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Certifying Physician:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.accomplishedBy?.certifyingPhysician || ""}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">License No.:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.accomplishedBy?.licenseNo || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* X. PROCESSING INFORMATION */}
            <div className="mb-6">
              <div className="font-bold text-sm border-b border-black mb-3 pb-1">
                X. PROCESSING INFORMATION
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <span className="text-gray-600">Processing Officer:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.processingInfo?.processingOfficer}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Approving Officer:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.processingInfo?.approvingOfficer}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Encoder:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.processingInfo?.encoder}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Reporting Unit:</span>
                  <div className="border-b border-gray-300 mt-1 pb-0.5 uppercase">
                    {applicationData.processingInfo?.reportingUnit}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-right text-[10px] text-gray-400 mt-8">
              Revised as of August 1, 2021
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
