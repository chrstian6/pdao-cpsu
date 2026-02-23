"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  sexEnum,
  civilStatusEnum,
  disabilityTypeEnum,
  disabilityCauseEnum,
  educationalAttainmentEnum,
  employmentStatusEnum,
  occupationEnum,
  employmentCategoryEnum,
  accomplishedByEnum,
  type DisabilityCauseType,
} from "@/types/form";
import {
  PwdApplicationClientSchema,
  PwdApplicationFormData,
} from "@/types/application";
import { createPwdApplication } from "@/actions/application";
import { useAuthStore } from "@/lib/store/auth-store";

interface PwdApplicationFormProps {
  user: any;
}

// Define steps with shorter labels for compact design
const STEPS = [
  { id: "personal", label: "Personal", fullLabel: "Personal Information" },
  { id: "disability", label: "Disability", fullLabel: "Disability Details" },
  { id: "address", label: "Address", fullLabel: "Address & Contact" },
  { id: "employment", label: "Employment", fullLabel: "Employment Details" },
  { id: "verification", label: "Verify", fullLabel: "Verification" },
];

export function PwdApplicationForm({ user }: PwdApplicationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
  const { user: currentUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid: isFormValid },
  } = useForm<PwdApplicationFormData>({
    resolver: zodResolver(PwdApplicationClientSchema),
    mode: "onChange",
    defaultValues: {
      applicationType: {
        isNewApplicant: true,
        isRenewal: false,
      },
      dateApplied: format(new Date(), "MM/dd/yyyy"),
      personalInfo: {
        lastName: user.last_name || "",
        firstName: user.first_name || "",
        middleName: user.middle_name || "",
        suffix: user.suffix || "",
        dateOfBirth: user.date_of_birth || "",
        sex:
          user.sex === "Male"
            ? "MALE"
            : user.sex === "Female"
              ? "FEMALE"
              : "FEMALE",
        civilStatus: "Single",
      },
      disabilityInfo: {
        types: [],
        causes: [],
      },
      address: {
        houseNoStreet: user.address?.street || "",
        barangay: user.address?.barangay || "",
        municipality: user.address?.city_municipality || "",
        province: user.address?.province || "",
        region: user.address?.region || "",
      },
      contactDetails: {
        landlineNo: "",
        mobileNo: user.contact_number || "",
        emailAddress: user.email || "",
      },
      educationalAttainment: [],
      employmentStatus: [],
      occupation: {
        types: [],
        otherSpecify: "",
      },
      employmentCategory: [],
      organizationInfo: [],
      idReferences: {
        sssNo: "",
        pagIbigNo: "",
        psnNo: "",
        philHealthNo: "",
      },
      familyBackground: {
        father: {
          lastName: "",
          firstName: "",
          middleName: "",
        },
        mother: {
          lastName: "",
          firstName: "",
          middleName: "",
        },
        guardian: {
          lastName: "",
          firstName: "",
          middleName: "",
        },
      },
      accomplishedBy: {
        type: "APPLICANT",
        certifyingPhysician: "",
        licenseNo: "",
      },
      processingInfo: {
        processingOfficer: "DELA CRUZ ANYA GUANZON",
        approvingOfficer: "GATILAO MAUREEN JOHANNA GARCIA",
        encoder: currentUser?.full_name || "MONTES REYMARK TACGA",
        reportingUnit: "PDAO",
      },
      controlNo: "",
    },
  });

  const selectedOccupation = watch("occupation.types");
  const selectedDisabilityTypes = watch("disabilityInfo.types");
  const selectedDisabilityCauses = watch("disabilityInfo.causes");
  const applicationType = watch("applicationType");
  const employmentStatus = watch("employmentStatus");
  const isUnemployed = employmentStatus.includes("Unemployed");

  // Check if current step is complete
  const isStepComplete = async (step: number): Promise<boolean> => {
    switch (step) {
      case 0: // Personal
        const applicationTypeValid =
          applicationType?.isNewApplicant !== undefined ||
          applicationType?.isRenewal !== undefined;
        const lastNameValid = !!watch("personalInfo.lastName");
        const firstNameValid = !!watch("personalInfo.firstName");
        const dobValid = !!watch("personalInfo.dateOfBirth");
        const sexValid = !!watch("personalInfo.sex");
        const civilStatusValid = !!watch("personalInfo.civilStatus");

        return (
          applicationTypeValid &&
          lastNameValid &&
          firstNameValid &&
          dobValid &&
          sexValid &&
          civilStatusValid
        );

      case 1: // Disability
        const typesValid = selectedDisabilityTypes.length > 0;
        const causesValid = selectedDisabilityCauses.length > 0;
        return typesValid && causesValid;

      case 2: // Address
        const houseNoStreetValid = !!watch("address.houseNoStreet");
        const barangayValid = !!watch("address.barangay");
        const municipalityValid = !!watch("address.municipality");
        const provinceValid = !!watch("address.province");
        const regionValid = !!watch("address.region");
        const mobileValid = !!watch("contactDetails.mobileNo");
        const emailValid = !!watch("contactDetails.emailAddress");

        return (
          houseNoStreetValid &&
          barangayValid &&
          municipalityValid &&
          provinceValid &&
          regionValid &&
          mobileValid &&
          emailValid
        );

      case 3: // Employment (optional but with conditional logic)
        // If unemployed, no need to check occupation and employment category
        if (isUnemployed) {
          return true;
        }
        // If employed, occupation and employment category are still optional
        return true;

      case 4: // Verification
        return true;

      default:
        return false;
    }
  };

  // Validate current step and mark as complete
  const validateAndCompleteStep = async () => {
    const complete = await isStepComplete(currentStep);
    if (complete && !completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    return complete;
  };

  // Handle next button
  const handleNext = async () => {
    const isCurrentStepValid = await isStepComplete(currentStep);

    if (!isCurrentStepValid) {
      toast.error("Please complete all required fields in this step first", {
        description: "Fields marked with * are required",
      });
      return;
    }

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }

    // Move to next step
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous button
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle step click from timeline (only allow if step is completed or is next logical step)
  const handleStepClick = (index: number) => {
    // Allow clicking on completed steps
    if (completedSteps.includes(index)) {
      setCurrentStep(index);
      return;
    }

    // Allow clicking on the next available step if all previous are completed
    const allPreviousCompleted = Array.from(
      { length: index },
      (_, i) => i,
    ).every((i) => completedSteps.includes(i) || i === currentStep);

    if (allPreviousCompleted && index === currentStep + 1) {
      // Check if current step is valid before allowing to click next
      validateAndCompleteStep().then((isValid) => {
        if (isValid) {
          setCurrentStep(index);
        } else {
          toast.error("Please complete the current step first");
        }
      });
    } else if (index > currentStep + 1) {
      toast.error("Please complete previous steps first");
    }
  };

  const handleApplicationTypeChange = (
    type: "isNewApplicant" | "isRenewal",
  ) => {
    if (type === "isNewApplicant") {
      setValue("applicationType", {
        isNewApplicant: true,
        isRenewal: false,
      });
    } else {
      setValue("applicationType", {
        isNewApplicant: false,
        isRenewal: true,
      });
    }
    trigger("applicationType");
  };

  const onSubmit = async (data: PwdApplicationFormData) => {
    // Final validation before submission
    const finalStepValid = await isStepComplete(4);
    if (!finalStepValid) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use user.user_id (PDAO format) instead of user._id (MongoDB ObjectId)
      const result = await createPwdApplication(user.user_id, data);

      if (result.success) {
        toast.success("Application Submitted Successfully", {
          description: "The PWD application has been submitted successfully.",
        });

        setTimeout(() => {
          router.push("/dashboard/registry");
          router.refresh();
        }, 2000);
      } else {
        toast.error("Submission Failed", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/registry");
  };

  const handleCheckboxChange = (
    field: string,
    value: string,
    currentValues: string[],
  ) => {
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setValue(field as any, newValues as any);
    trigger(field as any);
  };

  // Helper function to transform input to uppercase
  const toUpperCase = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.toUpperCase();
  };

  // Determine if we're on the last step
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-none border-none shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-1">
            <CardTitle className="text-xl">PWD Application Form</CardTitle>
            <CardDescription className="text-sm">
              Complete all required information marked with an asterisk (*)
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Compact Timeline/Steps Indicator */}
      <div className="w-full py-2">
        <div className="flex items-center justify-between px-1">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Circle - Smaller and more compact */}
              <div className="flex flex-col items-center relative">
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={`flex items-center justify-center w-7 h-7 rounded-full border transition-all text-xs font-medium ${
                    currentStep === index
                      ? "border-green-800 bg-green-800 text-white"
                      : completedSteps.includes(index)
                        ? "border-green-800 bg-green-800 text-white"
                        : "border-gray-300 bg-white text-gray-500"
                  } ${index <= currentStep || completedSteps.includes(index) ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                  disabled={
                    index > currentStep && !completedSteps.includes(index)
                  }
                >
                  {completedSteps.includes(index) ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[10px]">{index + 1}</span>
                  )}
                </button>
                <span
                  className={`absolute top-8 text-[10px] font-medium whitespace-nowrap ${
                    currentStep === index ? "text-green-800" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line - Thinner */}
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    completedSteps.includes(index)
                      ? "bg-green-800"
                      : "bg-gray-300"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="shadow-none border-none">
          <CardContent className="pt-4">
            {/* Personal Information Step */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">Personal Information</h3>

                {/* Application Type Checkboxes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Application Type <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-4 p-3 border rounded-md bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-applicant"
                        checked={applicationType?.isNewApplicant}
                        onCheckedChange={() =>
                          handleApplicationTypeChange("isNewApplicant")
                        }
                      />
                      <Label
                        htmlFor="new-applicant"
                        className="text-sm font-normal cursor-pointer"
                      >
                        NEW APPLICANT
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="renewal"
                        checked={applicationType?.isRenewal}
                        onCheckedChange={() =>
                          handleApplicationTypeChange("isRenewal")
                        }
                      />
                      <Label
                        htmlFor="renewal"
                        className="text-sm font-normal cursor-pointer"
                      >
                        RENEWAL
                      </Label>
                    </div>
                  </div>
                  {errors.applicationType && (
                    <p className="text-xs text-red-500">
                      Please select an application type
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Last Name */}
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-sm">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      {...register("personalInfo.lastName")}
                      placeholder="ENTER LAST NAME"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.personalInfo?.lastName && (
                      <p className="text-xs text-red-500">
                        {errors.personalInfo.lastName.message}
                      </p>
                    )}
                  </div>

                  {/* First Name */}
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-sm">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      {...register("personalInfo.firstName")}
                      placeholder="ENTER FIRST NAME"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.personalInfo?.firstName && (
                      <p className="text-xs text-red-500">
                        {errors.personalInfo.firstName.message}
                      </p>
                    )}
                  </div>

                  {/* Middle Name - OPTIONAL */}
                  <div className="space-y-1">
                    <Label htmlFor="middleName" className="text-sm">
                      Middle Name (Optional)
                    </Label>
                    <Input
                      id="middleName"
                      {...register("personalInfo.middleName")}
                      placeholder="ENTER MIDDLE NAME"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                  </div>

                  {/* Suffix - OPTIONAL */}
                  <div className="space-y-1">
                    <Label htmlFor="suffix" className="text-sm">
                      Suffix (Optional)
                    </Label>
                    <Input
                      id="suffix"
                      {...register("personalInfo.suffix")}
                      placeholder="JR., SR., III, ETC."
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1">
                    <Label htmlFor="dateOfBirth" className="text-sm">
                      Date of Birth <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("personalInfo.dateOfBirth")}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.personalInfo?.dateOfBirth && (
                      <p className="text-xs text-red-500">
                        {errors.personalInfo.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Sex */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Sex <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    defaultValue={user.sex === "Male" ? "MALE" : "FEMALE"}
                    onValueChange={(value) => {
                      setValue("personalInfo.sex", value as any);
                      trigger("personalInfo.sex");
                    }}
                    className="flex flex-wrap gap-4"
                  >
                    {sexEnum.map((sex) => (
                      <div key={sex} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={sex}
                          id={`sex-${sex}`}
                          className="h-3.5 w-3.5"
                        />
                        <Label
                          htmlFor={`sex-${sex}`}
                          className="text-sm font-normal uppercase"
                        >
                          {sex}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Civil Status */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Civil Status <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    defaultValue="Single"
                    onValueChange={(value) => {
                      setValue("personalInfo.civilStatus", value as any);
                      trigger("personalInfo.civilStatus");
                    }}
                    className="flex flex-wrap gap-4"
                  >
                    {civilStatusEnum.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={status}
                          id={`status-${status}`}
                          className="h-3.5 w-3.5"
                        />
                        <Label
                          htmlFor={`status-${status}`}
                          className="text-sm font-normal uppercase"
                        >
                          {status}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Disability Information Step */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">Disability Information</h3>

                {/* Type of Disability */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Type of Disability <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500 mb-1">
                    Select all that apply
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {disabilityTypeEnum.map((type) => (
                      <div key={type} className="flex items-start space-x-2">
                        <Checkbox
                          id={`disability-type-${type}`}
                          checked={selectedDisabilityTypes.includes(type)}
                          onCheckedChange={() =>
                            handleCheckboxChange(
                              "disabilityInfo.types",
                              type,
                              selectedDisabilityTypes,
                            )
                          }
                          className="h-3.5 w-3.5 mt-0.5"
                        />
                        <Label
                          htmlFor={`disability-type-${type}`}
                          className="text-xs font-normal uppercase leading-tight"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.disabilityInfo?.types && (
                    <p className="text-xs text-red-500">
                      {errors.disabilityInfo.types.message}
                    </p>
                  )}
                </div>

                <Separator className="my-3" />

                {/* Cause of Disability - UPDATED TO SINGLE SELECT (RADIO BUTTONS) WITH TYPE FIX */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Cause of Disability <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500 mb-1">
                    Select one option
                  </p>
                  <RadioGroup
                    value={selectedDisabilityCauses[0] || ""}
                    onValueChange={(value: DisabilityCauseType) => {
                      // Set as array with single value for the schema
                      setValue("disabilityInfo.causes", [value]);
                      trigger("disabilityInfo.causes");
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2"
                  >
                    {disabilityCauseEnum.map((cause) => (
                      <div key={cause} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={cause}
                          id={`disability-cause-${cause}`}
                          className="h-3.5 w-3.5"
                        />
                        <Label
                          htmlFor={`disability-cause-${cause}`}
                          className="text-sm font-normal uppercase cursor-pointer"
                        >
                          {cause}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {errors.disabilityInfo?.causes && (
                    <p className="text-xs text-red-500">
                      {errors.disabilityInfo.causes.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Address Step */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">Residence Address</h3>

                <div className="grid grid-cols-1 gap-3">
                  {/* House No. and Street */}
                  <div className="space-y-1">
                    <Label htmlFor="houseNoStreet" className="text-sm">
                      House No. and Street{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="houseNoStreet"
                      {...register("address.houseNoStreet")}
                      placeholder="ENTER HOUSE NUMBER AND STREET"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.address?.houseNoStreet && (
                      <p className="text-xs text-red-500">
                        {errors.address.houseNoStreet.message}
                      </p>
                    )}
                  </div>

                  {/* Barangay */}
                  <div className="space-y-1">
                    <Label htmlFor="barangay" className="text-sm">
                      Barangay <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="barangay"
                      {...register("address.barangay")}
                      placeholder="ENTER BARANGAY"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.address?.barangay && (
                      <p className="text-xs text-red-500">
                        {errors.address.barangay.message}
                      </p>
                    )}
                  </div>

                  {/* Municipality */}
                  <div className="space-y-1">
                    <Label htmlFor="municipality" className="text-sm">
                      Municipality <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="municipality"
                      {...register("address.municipality")}
                      placeholder="ENTER MUNICIPALITY"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.address?.municipality && (
                      <p className="text-xs text-red-500">
                        {errors.address.municipality.message}
                      </p>
                    )}
                  </div>

                  {/* Province */}
                  <div className="space-y-1">
                    <Label htmlFor="province" className="text-sm">
                      Province <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="province"
                      {...register("address.province")}
                      placeholder="ENTER PROVINCE"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.address?.province && (
                      <p className="text-xs text-red-500">
                        {errors.address.province.message}
                      </p>
                    )}
                  </div>

                  {/* Region */}
                  <div className="space-y-1">
                    <Label htmlFor="region" className="text-sm">
                      Region <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="region"
                      {...register("address.region")}
                      placeholder="ENTER REGION"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.address?.region && (
                      <p className="text-xs text-red-500">
                        {errors.address.region.message}
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="my-3" />

                <h3 className="text-md font-medium">Contact Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Landline - OPTIONAL */}
                  <div className="space-y-1">
                    <Label htmlFor="landlineNo" className="text-sm">
                      Landline No. (Optional)
                    </Label>
                    <Input
                      id="landlineNo"
                      {...register("contactDetails.landlineNo")}
                      placeholder="ENTER LANDLINE NUMBER"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1">
                    <Label htmlFor="mobileNo" className="text-sm">
                      Mobile No. <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="mobileNo"
                      {...register("contactDetails.mobileNo")}
                      placeholder="09123456789"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.contactDetails?.mobileNo && (
                      <p className="text-xs text-red-500">
                        {errors.contactDetails.mobileNo.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="emailAddress" className="text-sm">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="emailAddress"
                      type="email"
                      {...register("contactDetails.emailAddress")}
                      placeholder="EMAIL@EXAMPLE.COM"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    {errors.contactDetails?.emailAddress && (
                      <p className="text-xs text-red-500">
                        {errors.contactDetails.emailAddress.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Employment Step - ALL OPTIONAL */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">Employment Details</h3>
                <p className="text-xs text-gray-500 mb-2">
                  All fields in this section are optional.
                </p>

                {/* Educational Attainment */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Educational Attainment
                  </Label>
                  <p className="text-xs text-gray-500 mb-1">
                    Select all that apply
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {educationalAttainmentEnum.map((edu) => (
                      <div key={edu} className="flex items-start space-x-2">
                        <Checkbox
                          id={`edu-${edu}`}
                          checked={watch("educationalAttainment").includes(edu)}
                          onCheckedChange={() =>
                            handleCheckboxChange(
                              "educationalAttainment",
                              edu,
                              watch("educationalAttainment"),
                            )
                          }
                          className="h-3.5 w-3.5 mt-0.5"
                        />
                        <Label
                          htmlFor={`edu-${edu}`}
                          className="text-xs font-normal uppercase leading-tight"
                        >
                          {edu}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Employment Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Status of Employment
                  </Label>
                  <p className="text-xs text-gray-500 mb-1">
                    Select all that apply
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {employmentStatusEnum.map((status) => (
                      <div key={status} className="flex items-start space-x-2">
                        <Checkbox
                          id={`emp-status-${status}`}
                          checked={employmentStatus.includes(status)}
                          onCheckedChange={() =>
                            handleCheckboxChange(
                              "employmentStatus",
                              status,
                              employmentStatus,
                            )
                          }
                          className="h-3.5 w-3.5 mt-0.5"
                        />
                        <Label
                          htmlFor={`emp-status-${status}`}
                          className="text-xs font-normal uppercase leading-tight"
                        >
                          {status}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Occupation - Show only if not unemployed */}
                {!isUnemployed && (
                  <>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Occupation</Label>
                      <p className="text-xs text-gray-500 mb-1">
                        Select all that apply
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {occupationEnum.map((occ) => (
                          <div key={occ} className="flex items-start space-x-2">
                            <Checkbox
                              id={`occ-${occ}`}
                              checked={selectedOccupation.includes(occ)}
                              onCheckedChange={() =>
                                handleCheckboxChange(
                                  "occupation.types",
                                  occ,
                                  selectedOccupation,
                                )
                              }
                              className="h-3.5 w-3.5 mt-0.5"
                            />
                            <Label
                              htmlFor={`occ-${occ}`}
                              className="text-xs font-normal uppercase leading-tight"
                            >
                              {occ}
                            </Label>
                          </div>
                        ))}
                      </div>

                      {selectedOccupation.includes("Others") && (
                        <div className="mt-2 space-y-1">
                          <Label htmlFor="otherOccupation" className="text-sm">
                            Please specify other occupation
                          </Label>
                          <Input
                            id="otherOccupation"
                            {...register("occupation.otherSpecify")}
                            placeholder="ENTER OCCUPATION"
                            onChange={toUpperCase}
                            className="uppercase h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    <Separator className="my-3" />

                    {/* Employment Category */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Category of Employment
                      </Label>
                      <p className="text-xs text-gray-500 mb-1">
                        Select all that apply
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {employmentCategoryEnum.map((cat) => (
                          <div key={cat} className="flex items-start space-x-2">
                            <Checkbox
                              id={`emp-cat-${cat}`}
                              checked={
                                watch("employmentCategory")?.includes(cat) ||
                                false
                              }
                              onCheckedChange={() =>
                                handleCheckboxChange(
                                  "employmentCategory",
                                  cat,
                                  watch("employmentCategory") || [],
                                )
                              }
                              className="h-3.5 w-3.5 mt-0.5"
                            />
                            <Label
                              htmlFor={`emp-cat-${cat}`}
                              className="text-xs font-normal uppercase leading-tight"
                            >
                              {cat}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Verification Step */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">Verification Details</h3>

                {/* ID References - ALL OPTIONAL */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    ID Reference Numbers (Optional)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="sssNo" className="text-sm">
                        SSS No.
                      </Label>
                      <Input
                        id="sssNo"
                        {...register("idReferences.sssNo")}
                        placeholder="ENTER SSS NUMBER"
                        onChange={toUpperCase}
                        className="uppercase h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="pagIbigNo" className="text-sm">
                        PAG-IBIG No.
                      </Label>
                      <Input
                        id="pagIbigNo"
                        {...register("idReferences.pagIbigNo")}
                        placeholder="ENTER PAG-IBIG NUMBER"
                        onChange={toUpperCase}
                        className="uppercase h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="psnNo" className="text-sm">
                        PSN No.
                      </Label>
                      <Input
                        id="psnNo"
                        {...register("idReferences.psnNo")}
                        placeholder="ENTER PSN NUMBER"
                        onChange={toUpperCase}
                        className="uppercase h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="philHealthNo" className="text-sm">
                        PhilHealth No.
                      </Label>
                      <Input
                        id="philHealthNo"
                        {...register("idReferences.philHealthNo")}
                        placeholder="ENTER PHILHEALTH NUMBER"
                        onChange={toUpperCase}
                        className="uppercase h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Family Background - UPDATED SECTION */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Family Background</h4>

                  {/* Father's Name */}
                  <div className="space-y-2">
                    <Label className="text-sm">Father's Full Name</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.father.lastName")}
                          placeholder="LAST NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.father.firstName")}
                          placeholder="FIRST NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.father.middleName")}
                          placeholder="MIDDLE NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mother's Name */}
                  <div className="space-y-2">
                    <Label className="text-sm">Mother's Full Name</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.mother.lastName")}
                          placeholder="LAST NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.mother.firstName")}
                          placeholder="FIRST NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.mother.middleName")}
                          placeholder="MIDDLE NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Guardian's Name */}
                  <div className="space-y-2">
                    <Label className="text-sm">Guardian's Full Name</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.guardian.lastName")}
                          placeholder="LAST NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.guardian.firstName")}
                          placeholder="FIRST NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          {...register("familyBackground.guardian.middleName")}
                          placeholder="MIDDLE NAME"
                          onChange={toUpperCase}
                          className="uppercase h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Accomplished By - SINGLE SELECTION with RadioGroup */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Accomplished By</h4>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">
                        Select who accomplished this form{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <RadioGroup
                        defaultValue="APPLICANT"
                        onValueChange={(value) => {
                          setValue("accomplishedBy.type", value as any);
                          trigger("accomplishedBy.type");
                        }}
                        className="flex flex-wrap gap-4"
                      >
                        {accomplishedByEnum.map((type) => (
                          <div
                            key={type}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={type}
                              id={`accomplished-${type}`}
                              className="h-3.5 w-3.5"
                            />
                            <Label
                              htmlFor={`accomplished-${type}`}
                              className="text-sm font-normal uppercase cursor-pointer"
                            >
                              {type}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      {errors.accomplishedBy?.type && (
                        <p className="text-xs text-red-500">
                          {errors.accomplishedBy.type.message}
                        </p>
                      )}
                    </div>

                    {/* Certifying Physician - OPTIONAL */}
                    <div className="space-y-1">
                      <Label htmlFor="certifyingPhysician" className="text-sm">
                        Name of Certifying Physician (Optional)
                      </Label>
                      <Input
                        id="certifyingPhysician"
                        {...register("accomplishedBy.certifyingPhysician")}
                        placeholder="ENTER PHYSICIAN'S NAME"
                        onChange={toUpperCase}
                        className="uppercase h-8 text-sm"
                      />
                    </div>

                    {/* License Number - OPTIONAL */}
                    <div className="space-y-1">
                      <Label htmlFor="licenseNo" className="text-sm">
                        License Number (Optional)
                      </Label>
                      <Input
                        id="licenseNo"
                        {...register("accomplishedBy.licenseNo")}
                        placeholder="ENTER LICENSE NUMBER"
                        onChange={toUpperCase}
                        className="uppercase h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Processing Information - REQUIRED */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    Processing Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="processingOfficer" className="text-sm">
                        Processing Officer{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="processingOfficer"
                        {...register("processingInfo.processingOfficer")}
                        value="DELA CRUZ ANYA GUANZON"
                        readOnly
                        className="bg-gray-50 uppercase h-8 text-sm"
                      />
                      {errors.processingInfo?.processingOfficer && (
                        <p className="text-xs text-red-500">
                          {errors.processingInfo.processingOfficer.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="approvingOfficer" className="text-sm">
                        Approving Officer{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="approvingOfficer"
                        {...register("processingInfo.approvingOfficer")}
                        value="GATILAO MAUREEN JOHANNA GARCIA"
                        readOnly
                        className="bg-gray-50 uppercase h-8 text-sm"
                      />
                      {errors.processingInfo?.approvingOfficer && (
                        <p className="text-xs text-red-500">
                          {errors.processingInfo.approvingOfficer.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="encoder" className="text-sm">
                        Encoder <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="encoder"
                        {...register("processingInfo.encoder")}
                        value={currentUser?.full_name || "MONTES REYMARK TACGA"}
                        readOnly
                        className="bg-gray-50 uppercase h-8 text-sm"
                      />
                      {errors.processingInfo?.encoder && (
                        <p className="text-xs text-red-500">
                          {errors.processingInfo.encoder.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="reportingUnit" className="text-sm">
                        Reporting Unit <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="reportingUnit"
                        {...register("processingInfo.reportingUnit")}
                        value="PDAO"
                        readOnly
                        className="bg-gray-50 uppercase h-8 text-sm"
                      />
                      {errors.processingInfo?.reportingUnit && (
                        <p className="text-xs text-red-500">
                          {errors.processingInfo.reportingUnit.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Control Number - OPTIONAL */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Control Information</h4>

                  <div className="space-y-1">
                    <Label htmlFor="controlNo" className="text-sm">
                      Control Number (Optional)
                    </Label>
                    <Input
                      id="controlNo"
                      {...register("controlNo")}
                      placeholder="ENTER CONTROL NUMBER"
                      onChange={toUpperCase}
                      className="uppercase h-8 text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Revised as of August 1, 2021
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons - Green Color Scheme */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="border-green-800 text-green-800 hover:bg-green-50 h-8 text-sm"
            >
              Cancel
            </Button>

            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
                className="border-green-800 text-green-800 hover:bg-green-50 h-8 text-sm"
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {isLastStep ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-w-[150px] bg-green-800 hover:bg-green-700 text-white h-8 text-sm"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="w-full sm:w-auto min-w-[150px] bg-green-800 hover:bg-green-700 text-white h-8 text-sm"
              >
                Next
              </Button>
            )}
          </div>
        </div>

        {/* Step Progress Indicator */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          Step {currentStep + 1} of {STEPS.length}:{" "}
          {STEPS[currentStep].fullLabel}
        </div>
      </form>
    </div>
  );
}
