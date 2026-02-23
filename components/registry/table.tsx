"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserListItem } from "@/actions/registry";
import {
  verifyUser,
  renewUserCard,
  checkCardExpiryStatus,
} from "@/actions/registrystatus";
import {
  checkBatchApplicationStatus,
  UserStatus,
} from "@/actions/application-status";
import { getPwdApplicationByUserId } from "@/actions/application";
import { PdfViewerModal } from "./pdf-viewer-modal";
import {
  getFullName,
  formatDisplayDate,
  getVerificationBadgeVariant,
  getSexDisplay,
  formatPWDId,
  formatCardId,
} from "@/utils/registry";
import { RegistryFilters } from "./filters";
import {
  Loader2,
  Calendar,
  User as UserIcon,
  IdCard,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Clock,
  FileQuestion,
  UserCheck,
  Eye,
  FileText,
  AlertCircle,
} from "lucide-react";

interface RegistryTableProps {
  initialUsers: UserListItem[];
}

interface FilterState {
  search: string;
  verification: string;
}

export function RegistryTable({ initialUsers }: RegistryTableProps) {
  const router = useRouter();
  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    verification: "all",
  });
  const [filteredUsers, setFilteredUsers] =
    React.useState<UserListItem[]>(initialUsers);
  const [userStatuses, setUserStatuses] = React.useState<
    Record<string, UserStatus>
  >({});
  const [loading, setLoading] = React.useState<string | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<"verify" | "renew" | null>(
    null,
  );
  const [selectedUser, setSelectedUser] = React.useState<UserListItem | null>(
    null,
  );

  // New dialog for existing application
  const [existingAppDialogOpen, setExistingAppDialogOpen] = React.useState(false);
  const [existingAppUser, setExistingAppUser] = React.useState<UserListItem | null>(null);

  // PDF Viewer modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedApplication, setSelectedApplication] =
    React.useState<any>(null);
  const [selectedUserForModal, setSelectedUserForModal] =
    React.useState<UserListItem | null>(null);
  const [applicationLoading, setApplicationLoading] = React.useState(false);

  // Fetch statuses for all users
  React.useEffect(() => {
    const fetchStatuses = async () => {
      if (initialUsers.length === 0) return;

      setStatusLoading(true);
      const userIds = initialUsers.map((user) => user.user_id);

      const result = await checkBatchApplicationStatus(userIds);

      if (result.success && result.data) {
        setUserStatuses(result.data);
      } else {
        console.error("Failed to fetch user statuses:", result.error);
      }

      setStatusLoading(false);
    };

    fetchStatuses();
  }, [initialUsers]);

  // Filter function
  React.useEffect(() => {
    let filtered = [...initialUsers];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((user) => {
        const fullName = getFullName(user).toLowerCase();
        const email = user.email.toLowerCase();
        const userId = user.user_id.toLowerCase();
        const pwdId = user.pwd_issued_id?.toLowerCase() || "";
        const cardId = user.card_id?.toLowerCase() || "";

        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          userId.includes(searchLower) ||
          pwdId.includes(searchLower) ||
          cardId.includes(searchLower)
        );
      });
    }

    // Apply verification filter
    if (filters.verification !== "all") {
      filtered = filtered.filter((user) =>
        filters.verification === "verified"
          ? user.is_verified === true
          : user.is_verified === false,
      );
    }

    setFilteredUsers(filtered);
  }, [filters, initialUsers]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleVerify = async (user: UserListItem) => {
    // Check if user is already verified
    if (user.is_verified) {
      toast.error("User is already verified");
      return;
    }

    const status = userStatuses[user.user_id];

    // Check if user has an existing application
    if (status?.hasApplication) {
      // Show dialog that application already exists
      setExistingAppUser(user);
      setExistingAppDialogOpen(true);
      return;
    }

    // No existing application - proceed with verification
    setSelectedUser(user);
    setDialogType("verify");
    setDialogOpen(true);
  };

  const handleRenew = async (user: UserListItem) => {
    // Check if user has an active card
    if (!user.card_id) {
      toast.error("User does not have an active PWD card");
      return;
    }

    // Check if user is verified
    if (!user.is_verified) {
      toast.error("User must be verified first");
      return;
    }

    // Check if user can renew before opening dialog
    setLoading(user._id);
    try {
      const expiryStatus = await checkCardExpiryStatus(user._id);

      if (expiryStatus.success) {
        if (expiryStatus.status === "valid") {
          if (
            expiryStatus.daysUntilExpiry &&
            expiryStatus.daysUntilExpiry > 30
          ) {
            toast.error(
              `Card is still valid for ${expiryStatus.daysUntilExpiry} more days. Renewal is only allowed within 30 days of expiry.`,
            );
            setLoading(null);
            return;
          }
          setSelectedUser(user);
          setDialogType("renew");
          setDialogOpen(true);
          setLoading(null);
          return;
        }

        if (expiryStatus.status === "expired") {
          toast.warning(
            "This card has expired. A new card will be issued upon renewal.",
          );
        }

        setSelectedUser(user);
        setDialogType("renew");
        setDialogOpen(true);
      } else {
        toast.error(expiryStatus.error || "Failed to check card status");
      }
    } catch (error) {
      toast.error("Failed to check card status");
    } finally {
      setLoading(null);
    }
  };

  const handleViewApplication = async (user: UserListItem) => {
    if (!user.user_id) return;

    setApplicationLoading(true);
    try {
      const result = await getPwdApplicationByUserId(user.user_id);

      if (result.success && result.data) {
        setSelectedApplication(result.data);
        setSelectedUserForModal(user);
        setModalOpen(true);
      } else {
        toast.error("No application found for this user");
      }
    } catch (error) {
      toast.error("Failed to fetch application details");
    } finally {
      setApplicationLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!selectedUser || !dialogType) return;

    setLoading(selectedUser._id);
    setDialogOpen(false);

    try {
      if (dialogType === "verify") {
        router.push(`/dashboard/registry/verify/${selectedUser.user_id}`);
      } else {
        const result = await renewUserCard(selectedUser._id);

        if (result.success) {
          toast.success(result.message || "Card renewed successfully");
          window.location.reload();
        } else {
          toast.error(result.error || "Failed to renew card");
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(null);
      setSelectedUser(null);
      setDialogType(null);
    }
  };

  const getDialogDescription = () => {
    if (!selectedUser) return "";

    if (dialogType === "verify") {
      return `You are about to start the verification process for ${getFullName(selectedUser)}. You will be redirected to the application form to complete their PWD card details.`;
    }

    return `Are you sure you want to renew the PWD card for ${getFullName(selectedUser)}? The card validity will be extended for another 3 years.`;
  };

  const getDialogTitle = () => {
    if (dialogType === "verify") return "Start Verification Process";
    return "Renew PWD Card";
  };

  // Helper function to check if user has an application
  const hasApplication = (user: UserListItem) => {
    const status = userStatuses[user.user_id];
    return status?.hasApplication || false;
  };

  // Helper function to check if user has submitted an application
  const hasSubmittedApplication = (user: UserListItem) => {
    return user.pwd_issued_id !== null && user.pwd_issued_id !== undefined;
  };

  // Helper function to check if user has an issued card
  const hasIssuedCard = (user: UserListItem) => {
    return user.card_id !== null && user.card_id !== undefined;
  };

  // Helper function to get application status display using our fetched status
  const getApplicationStatusDisplay = (user: UserListItem) => {
    const status = userStatuses[user.user_id];

    if (!status) {
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin text-gray-400" />,
        text: "Loading...",
        color: "text-gray-500",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        tooltip: "Fetching status...",
      };
    }

    // First check if user has an application
    if (!status.hasApplication) {
      return {
        icon: <FileQuestion className="h-3 w-3 text-gray-400" />,
        text: "No application",
        color: "text-gray-500",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        tooltip: "No application found. Click Verify to create one.",
      };
    }

    // Then check application status
    switch (status.applicationStatus) {
      case "verified":
        return {
          icon: <CheckCircle className="h-3 w-3 text-green-600" />,
          text: "Verified",
          color: "text-green-700",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          tooltip: "User verified and card issued",
        };
      case "completed":
        return {
          icon: <CheckCircle className="h-3 w-3 text-green-600" />,
          text: "Completed",
          color: "text-green-700",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          tooltip: "Application completed",
        };
      case "approved":
        return {
          icon: <CheckCircle className="h-3 w-3 text-green-600" />,
          text: "Approved",
          color: "text-green-700",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          tooltip: "Application approved",
        };
      case "submitted":
        return {
          icon: <Clock className="h-3 w-3 text-blue-600" />,
          text: "Submitted",
          color: "text-blue-700",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          tooltip: "Application submitted",
        };
      case "under_review":
        return {
          icon: <Clock className="h-3 w-3 text-purple-600" />,
          text: "Under Review",
          color: "text-purple-700",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          tooltip: "Application under review",
        };
      case "pending":
        return {
          icon: <Clock className="h-3 w-3 text-yellow-600" />,
          text: "Pending",
          color: "text-yellow-700",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          tooltip: "Application pending",
        };
      case "rejected":
        return {
          icon: <AlertTriangle className="h-3 w-3 text-red-600" />,
          text: "Rejected",
          color: "text-red-700",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          tooltip: "Application rejected",
        };
      default:
        return {
          icon: <FileText className="h-3 w-3 text-blue-600" />,
          text: "Application exists",
          color: "text-blue-700",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          tooltip: "Application exists. Click to view.",
        };
    }
  };

  // Helper function to get card status display using our fetched status
  const getCardStatusDisplay = (user: UserListItem) => {
    const status = userStatuses[user.user_id];

    if (!status) {
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin text-gray-400" />,
        text: "Loading...",
        color: "text-gray-500",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        tooltip: "Fetching status...",
      };
    }

    if (status.cardStatus === "active") {
      return {
        icon: <CheckCircle className="h-3 w-3 text-green-600" />,
        text: "Active card",
        color: "text-green-700",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        tooltip: "Card is active",
      };
    }

    return {
      icon: <IdCard className="h-3 w-3 text-gray-400" />,
      text: "No card issued",
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      tooltip: "Card will be issued upon verification",
    };
  };

  // Helper function to determine if verify button should be enabled
  const canVerify = (user: UserListItem) => {
    const status = userStatuses[user.user_id];

    // Can verify if:
    // 1. User is not verified
    // 2. User has no existing application
    return !user.is_verified && (!status?.hasApplication);
  };

  // Helper function to get verify button tooltip
  const getVerifyButtonTooltip = (user: UserListItem) => {
    if (user.is_verified) {
      return "User is already verified";
    }

    const status = userStatuses[user.user_id];
    if (status?.hasApplication) {
      return "User has already submitted an application. Click the application badge to view.";
    }

    return "Start verification process and create application";
  };

  return (
    <div className="space-y-4">
      <RegistryFilters onFilterChange={handleFilterChange} />

      {initialUsers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <UserIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold">No users found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              There are no users in the registry yet. Users will appear here
              once they register.
            </p>
          </div>
        </Card>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-green-600">
              <TableRow className="hover:bg-green-600 border-none">
                <TableHead className="w-[140px] text-white font-semibold">
                  User ID
                </TableHead>
                <TableHead className="w-[140px] text-white font-semibold">
                  Application
                </TableHead>
                <TableHead className="w-[140px] text-white font-semibold">
                  PWD Card
                </TableHead>
                <TableHead className="text-white font-semibold">
                  Full Name
                </TableHead>
                <TableHead className="w-[100px] text-white font-semibold">
                  Sex
                </TableHead>
                <TableHead className="w-[120px] text-white font-semibold">
                  Date of Birth
                </TableHead>
                <TableHead className="w-[100px] text-white font-semibold">
                  Status
                </TableHead>
                <TableHead className="w-[150px] text-center text-white font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-yellow-500" />
                      <p className="text-lg font-medium">No matching users</p>
                      <p className="text-sm">
                        Try adjusting your filters or search terms
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const appStatus = getApplicationStatusDisplay(user);
                  const cardStatus = getCardStatusDisplay(user);
                  const isVerified = user.is_verified === true;
                  const isLoading = loading === user._id;
                  const userStatus = userStatuses[user.user_id];
                  const hasExistingApp = hasApplication(user);
                  const canVerifyUser = canVerify(user);

                  return (
                    <TableRow key={user._id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {user.user_id}
                        </span>
                      </TableCell>

                      <TableCell>
                        <button
                          onClick={() => handleViewApplication(user)}
                          disabled={applicationLoading || !hasExistingApp}
                          className={`w-full text-left group ${
                            !hasExistingApp ? "cursor-not-allowed opacity-60" : ""
                          }`}
                          title={
                            hasExistingApp
                              ? "Click to view application details"
                              : "No application found"
                          }
                        >
                          <div
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${appStatus.bgColor} border ${appStatus.borderColor} ${
                              hasExistingApp
                                ? "group-hover:border-blue-400 group-hover:shadow-sm transition-all cursor-pointer"
                                : ""
                            }`}
                          >
                            {appStatus.icon}
                            <span
                              className={`text-xs font-medium ${appStatus.color}`}
                            >
                              {appStatus.text}
                            </span>
                            {hasExistingApp && (
                              <Eye className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                            )}
                          </div>
                        </button>
                        {hasSubmittedApplication(user) &&
                          user.pwd_issued_id && (
                            <div className="mt-1">
                              <span className="text-[10px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                ID: {formatPWDId(user.pwd_issued_id)}
                              </span>
                            </div>
                          )}
                      </TableCell>

                      <TableCell>
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${cardStatus.bgColor} border ${cardStatus.borderColor}`}
                          title={cardStatus.tooltip}
                        >
                          {cardStatus.icon}
                          <span
                            className={`text-xs font-medium ${cardStatus.color}`}
                          >
                            {cardStatus.text}
                          </span>
                        </div>
                        {hasIssuedCard(user) && user.card_id && (
                          <div className="mt-1">
                            <span className="text-[10px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                              Card: {formatCardId(user.card_id)}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">{getFullName(user)}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {user.email}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {getSexDisplay(user.sex)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDisplayDate(user.date_of_birth)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={getVerificationBadgeVariant(isVerified)}
                          className={
                            isVerified
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-yellow-100 text-yellow-700 border-yellow-200"
                          }
                        >
                          {isVerified ? "Verified" : "Not Verified"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {/* Verify Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerify(user)}
                            disabled={isLoading || isVerified}
                            className={`
                              h-8 px-3 text-xs font-medium min-w-[90px] transition-colors
                              ${
                                isVerified
                                  ? "bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed opacity-70"
                                  : hasExistingApp
                                    ? "bg-gray-50 text-gray-400 border-gray-300 cursor-not-allowed opacity-70"
                                    : isLoading || statusLoading
                                      ? "bg-blue-50 text-blue-500 border-blue-300 cursor-wait opacity-80"
                                      : "text-blue-700 border-blue-400 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-500 active:bg-blue-100 shadow-sm"
                              }
                            `}
                            title={getVerifyButtonTooltip(user)}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                                Verify
                              </>
                            )}
                          </Button>

                          {/* Renew Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRenew(user)}
                            disabled={
                              isLoading ||
                              !isVerified ||
                              !hasIssuedCard(user) ||
                              (userStatus && !userStatus.canRenew)
                            }
                            className={`h-8 px-3 text-xs font-medium min-w-[90px] ${
                              isVerified &&
                              hasIssuedCard(user) &&
                              !isLoading &&
                              userStatus?.canRenew
                                ? "text-green-700 border-green-400 hover:bg-green-50 hover:text-green-800 hover:border-green-500 active:bg-green-100 shadow-sm"
                                : "text-gray-400 border-gray-300 opacity-70 cursor-not-allowed bg-gray-50"
                            }`}
                            title={
                              !hasIssuedCard(user)
                                ? "No PWD card to renew"
                                : !isVerified
                                  ? "User must be verified first"
                                  : !userStatus?.canRenew
                                    ? "Cannot renew at this time"
                                    : isLoading
                                      ? "Renewing..."
                                      : "Renew Card"
                            }
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Renewing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                Renew
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Results count */}
          <div className="border-t bg-gray-50 px-4 py-2 text-xs text-muted-foreground">
            Showing {filteredUsers.length} of {initialUsers.length} users
          </div>
        </div>
      )}

      {/* Existing Application Dialog */}
      <Dialog open={existingAppDialogOpen} onOpenChange={setExistingAppDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Application Already Submitted
            </DialogTitle>
            <DialogDescription className="pt-4">
              {existingAppUser && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{getFullName(existingAppUser)}</span> has already submitted a PWD application form.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> You cannot create another application for this user.
                      Please click on the application badge in the table to view or manage their existing application.
                    </p>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                setExistingAppDialogOpen(false);
                setExistingAppUser(null);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for New Application */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDialogTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getDialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                dialogType === "verify"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {dialogType === "verify" ? "Continue to Form" : "Confirm Renew"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedApplication(null);
          setSelectedUserForModal(null);
        }}
        user={selectedUserForModal}
        userStatus={
          selectedUserForModal
            ? userStatuses[selectedUserForModal.user_id]
            : null
        }
        applicationData={selectedApplication}
        onStatusUpdate={() => {
          // Refresh the page to show updated status
          window.location.reload();
        }}
      />
    </div>
  );
}