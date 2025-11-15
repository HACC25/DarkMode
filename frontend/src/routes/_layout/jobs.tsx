import { Badge, Box, Flex, Heading, HStack, Input, Text, Textarea, VStack } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import { useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { FiX } from "react-icons/fi"

import type {
  JobListingCreate,
  JobListingParseResponse,
  JobListingRead,
} from "@/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Radio, RadioGroup } from "@/components/ui/radio"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useSubmitApplicationMutation } from "@/queries/applications"
import {
  useCreateJobListingMutation,
  useJobListingsQuery,
  useParseJobListingFileMutation,
  useParseJobListingMutation,
} from "@/queries/jobs"
import { useResumesQuery } from "@/queries/resumes"

type JobListingFormValues = {
  title: string
  description: string
  company_name: string
  location: string
  job_type: JobListingCreate["job_type"]
  is_remote: boolean
  salary_min: string
  salary_max: string
  expires_on: string
  minimum_qualifications: QualificationItem[]
  preferred_qualifications: QualificationItem[]
}

type QualificationItem = {
  value: string
}

const jobTypeOptions = [
  { value: "FT", label: "Full time" },
  { value: "PT", label: "Part time" },
  { value: "CO", label: "Contract" },
  { value: "IN", label: "Internship" },
  { value: "TE", label: "Temporary" },
] as const

export const Route = createFileRoute("/_layout/jobs")({
  component: JobsPage,
})

function JobsPage() {
  const { resolvedTheme } = useTheme()
  const themeMode = resolvedTheme === "dark" ? "dark" : "light"
  const colors: ColorTokens = {
    muted: themeMode === "dark" ? "gray.300" : "gray.600",
    cardBg: themeMode === "dark" ? "gray.900" : "white",
    softBg: themeMode === "dark" ? "gray.800" : "gray.50",
    border: themeMode === "dark" ? "gray.700" : "gray.200",
  }

  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { data: jobListings, isLoading } = useJobListingsQuery()
  const { data: resumes } = useResumesQuery({
    enabled: user?.role === "APPLICANT",
  })
  const [selectedJob, setSelectedJob] = useState<JobListingRead | null>(null)
  const [resumeId, setResumeId] = useState<string>("")
  const [coverLetter, setCoverLetter] = useState<string>("")
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [parseMode, setParseMode] = useState<"text" | "file">("text")
  const [parseTextInput, setParseTextInput] = useState("")
  const [parseFile, setParseFile] = useState<File | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const createListingForm = useForm<JobListingFormValues>({
    defaultValues: {
      title: "",
      description: "",
      company_name: "",
      location: "",
      job_type: "FT",
      is_remote: false,
      salary_min: "",
      salary_max: "",
      expires_on: "",
      minimum_qualifications: [],
      preferred_qualifications: [],
    },
  })

  const minimumFieldArray =
    useFieldArray<JobListingFormValues, "minimum_qualifications">({
      control: createListingForm.control,
      name: "minimum_qualifications",
    })

  const preferredFieldArray =
    useFieldArray<JobListingFormValues, "preferred_qualifications">({
      control: createListingForm.control,
      name: "preferred_qualifications",
    })

  const minimumFields = minimumFieldArray.fields
  const preferredFields = preferredFieldArray.fields

  const parseTextMutation = useParseJobListingMutation({
    onSuccess: (response) => {
      applyParsedResponse(response)
      showSuccessToast("Filled in job details from AI.")
      resetParseState()
    },
    onError: () => {
      showErrorToast("Could not parse the job details.")
    },
  })

  const parseFileMutation = useParseJobListingFileMutation({
    onSuccess: (response) => {
      applyParsedResponse(response)
      showSuccessToast("Filled in job details from AI.")
      resetParseState()
    },
    onError: () => {
      showErrorToast("Could not parse the uploaded file.")
    },
  })

  const applicantApplication = useSubmitApplicationMutation({
    onSuccess: () => {
      showSuccessToast("Application submitted.")
      setSelectedJob(null)
      setResumeId("")
      setCoverLetter("")
    },
    onError: () => {
      showErrorToast("Could not submit application.")
    },
  })

  const createListing = useCreateJobListingMutation({
    onSuccess: () => {
      showSuccessToast("Job listing created.")
      createListingForm.reset({
        title: "",
        description: "",
        company_name: "",
        location: "",
        job_type: "FT",
        is_remote: false,
        salary_min: "",
        salary_max: "",
        expires_on: "",
        minimum_qualifications: [],
        preferred_qualifications: [],
      })
    },
    onError: () => {
      showErrorToast("Could not create job listing.")
    },
  })

  const sortedJobs = useMemo(
    () =>
      (jobListings ?? []).slice().sort((a, b) => {
        return a.title.localeCompare(b.title)
      }),
    [jobListings],
  )
  const filteredJobs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    if (!normalizedSearch) {
      return sortedJobs
    }
    return sortedJobs.filter((job) => {
      const haystack = `${job.title} ${job.company_name ?? ""} ${job.location ?? ""}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [searchQuery, sortedJobs])
  const hasJobListings = sortedJobs.length > 0

  const handleApply = (job: JobListingRead) => {
    setSelectedJob(job)
    setResumeId(resumes?.[0]?.id ?? "")
    setCoverLetter("")
  }

  const submitApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedJob) {
      return
    }
    applicantApplication.mutate({
      job_listing_id: selectedJob.id,
      resume_id: resumeId || undefined,
      cover_letter: coverLetter || undefined,
    })
  }

  const parseNumericField = (value: string) => {
    if (!value) {
      return undefined
    }
    const numeric = Number(value)
    return Number.isNaN(numeric) ? value : numeric
  }

  const handleCreateListing = (values: JobListingFormValues) => {
    const normalizeList = (items: QualificationItem[]) => {
      const next = items
        .map((item) => item.value.trim())
        .filter((item) => item.length > 0)
      return next.length > 0 ? next : undefined
    }
    const payload: JobListingCreate = {
      title: values.title,
      description: values.description,
      company_name: values.company_name,
      location: values.location,
      job_type: values.job_type,
      is_remote: values.is_remote,
      salary_min: parseNumericField(values.salary_min),
      salary_max: parseNumericField(values.salary_max),
      expires_on: values.expires_on || undefined,
      minimum_qualifications: normalizeList(values.minimum_qualifications),
      preferred_qualifications: normalizeList(values.preferred_qualifications),
    }
    createListing.mutate(payload)
  }

  const applyParsedResponse = (response: JobListingParseResponse) => {
    const current = createListingForm.getValues()
    createListingForm.reset({
      ...current,
      title: response.title ?? current.title,
      description: response.description ?? current.description,
      company_name: response.company_name ?? current.company_name,
      location: response.location ?? current.location,
      job_type: response.job_type ?? current.job_type,
      is_remote:
        response.is_remote === undefined
          ? current.is_remote
          : Boolean(response.is_remote),
      salary_min: response.salary_min ?? current.salary_min,
      salary_max: response.salary_max ?? current.salary_max,
      expires_on: response.expires_on ?? current.expires_on,
      minimum_qualifications:
        response.minimum_qualifications?.map((item) => ({ value: item })) ??
        current.minimum_qualifications,
      preferred_qualifications:
        response.preferred_qualifications?.map((item) => ({ value: item })) ??
        current.preferred_qualifications,
    })
  }

  const resetParseState = () => {
    setAiDialogOpen(false)
    setParseTextInput("")
    setParseFile(null)
    setParseMode("text")
  }

  const buildDragHandlers = (
    onMove: (from: number, to: number) => void,
  ): {
    onDragStart: (event: DragEvent<HTMLDivElement>, index: number) => void
    onDragOver: (event: DragEvent<HTMLDivElement>) => void
    onDrop: (event: DragEvent<HTMLDivElement>, index: number) => void
  } => {
    return {
      onDragStart: (event, index) => {
        event.dataTransfer?.setData("text/plain", String(index))
        event.dataTransfer?.setDragImage(event.currentTarget, 10, 10)
      },
      onDragOver: (event) => {
        event.preventDefault()
      },
      onDrop: (event, index) => {
        event.preventDefault()
        const fromIndex = Number(event.dataTransfer?.getData("text/plain"))
        if (Number.isNaN(fromIndex) || fromIndex === index) return
        onMove(fromIndex, index)
      },
    }
  }

  const minimumDragHandlers = buildDragHandlers(
    (from, to) => minimumFieldArray.move(from, to),
  )
  const preferredDragHandlers = buildDragHandlers(
    (from, to) => preferredFieldArray.move(from, to),
  )

  const salaryFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [],
  )

  const formatSalaryRange = (min?: number | string | null, max?: number | string | null) => {
    const parsedMin = typeof min === "string" ? Number(min) : min ?? undefined
    const parsedMax = typeof max === "string" ? Number(max) : max ?? undefined
    if (parsedMin && parsedMax) {
      return `${salaryFormatter.format(parsedMin)} – ${salaryFormatter.format(parsedMax)}`
    }
    if (parsedMin) {
      return `From ${salaryFormatter.format(parsedMin)}`
    }
    if (parsedMax) {
      return `Up to ${salaryFormatter.format(parsedMax)}`
    }
    return undefined
  }

  return (
    <Box mx="auto" maxW="6xl" px={{ base: "4", md: "6" }} py={{ base: "6", md: "8" }}>
      <VStack align="stretch" gap={{ base: "6", md: "8" }}>
        <VStack gap="2" textAlign="center">
          <Heading size="lg">Jobs</Heading>
          <Text color={colors.muted}>
            Browse open roles, manage listings, and apply with a few clicks.
          </Text>
        </VStack>

        {user?.role === "COMPANY" && (
          <CardShell colors={colors}>
            <VStack align="stretch" gap="6">
              <Flex
                direction={{ base: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ base: "stretch", md: "center" }}
                gap="3"
              >
                <VStack align="flex-start" gap="1">
                  <Heading size="md">Create a job listing</Heading>
                  <Text color={colors.muted}>
                    Publish a new opportunity and share detailed requirements with applicants.
                  </Text>
                </VStack>
                <HStack justifyContent={{ base: "flex-start", md: "flex-end" }}>
                  <Button onClick={() => setAiDialogOpen(true)} type="button">
                    Fill in with AI
                  </Button>
                </HStack>
              </Flex>

              <form onSubmit={createListingForm.handleSubmit(handleCreateListing)}>
                <VStack align="stretch" gap="4">
                  <Field label="Title">
                    <Input
                      {...createListingForm.register("title", { required: true })}
                    />
                  </Field>
                  <Field label="Company">
                    <Input
                      {...createListingForm.register("company_name", {
                        required: true,
                      })}
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      {...createListingForm.register("location", { required: true })}
                    />
                  </Field>
                  <Controller
                    control={createListingForm.control}
                    name="job_type"
                    render={({ field }) => (
                      <Field label="Job type">
                        <RadioGroup
                          value={field.value}
                          onValueChange={({ value }) =>
                            field.onChange(value as JobListingCreate["job_type"])
                          }
                        >
                          <HStack gap="2" flexWrap="wrap">
                            {jobTypeOptions.map((option) => (
                              <Radio key={option.value} value={option.value}>
                                {option.label}
                              </Radio>
                            ))}
                          </HStack>
                        </RadioGroup>
                      </Field>
                    )}
                  />
                  <Controller
                    control={createListingForm.control}
                    name="is_remote"
                    render={({ field }) => (
                      <Field>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={({ checked }) => field.onChange(checked)}
                        >
                          Remote position
                        </Checkbox>
                      </Field>
                    )}
                  />
                  <Field label="Description">
                    <Textarea
                      {...createListingForm.register("description", {
                        required: true,
                      })}
                    />
                  </Field>
                  <Field
                    label="Minimum qualifications"
                    helperText="Add each requirement and drag to reorder."
                    w="full"
                  >
                    <VStack gap="2" w="full">
                      {minimumFields.map((field, index) => (
                        <Box
                          key={field.id}
                          borderWidth="1px"
                          borderRadius="md"
                          p="3"
                          w="full"
                          draggable
                          onDragStart={(event) =>
                            minimumDragHandlers.onDragStart(event, index)
                          }
                          onDragOver={minimumDragHandlers.onDragOver}
                          onDrop={(event) => minimumDragHandlers.onDrop(event, index)}
                          bg={colors.softBg}
                          borderColor={colors.border}
                        >
                          <HStack align="flex-start" gap="3" w="full">
                            <Textarea
                              placeholder="Add qualification"
                              flex="1"
                              resize="vertical"
                              rows={1}
                              minH="unset"
                              {...createListingForm.register(
                                `minimum_qualifications.${index}.value`,
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => minimumFieldArray.remove(index)}
                              aria-label="Remove requirement"
                              px="2"
                            >
                              <FiX />
                            </Button>
                          </HStack>
                        </Box>
                      ))}
                      <Button
                        type="button"
                        variant="subtle"
                        onClick={() => minimumFieldArray.append({ value: "" })}
                        alignSelf="flex-start"
                      >
                        Add requirement
                      </Button>
                    </VStack>
                  </Field>
                  <Field
                    label="Preferred qualifications"
                    helperText="Add each preference and drag to reorder."
                    w="full"
                  >
                    <VStack gap="2" w="full">
                      {preferredFields.map((field, index) => (
                        <Box
                          key={field.id}
                          borderWidth="1px"
                          borderRadius="md"
                          p="3"
                          w="full"
                          draggable
                          onDragStart={(event) =>
                            preferredDragHandlers.onDragStart(event, index)
                          }
                          onDragOver={preferredDragHandlers.onDragOver}
                          onDrop={(event) => preferredDragHandlers.onDrop(event, index)}
                          bg={colors.softBg}
                          borderColor={colors.border}
                        >
                          <HStack align="flex-start" gap="3" w="full">
                            <Textarea
                              placeholder="Add preference"
                              flex="1"
                              resize="vertical"
                              rows={1}
                              minH="unset"
                              {...createListingForm.register(
                                `preferred_qualifications.${index}.value`,
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => preferredFieldArray.remove(index)}
                              aria-label="Remove preference"
                              px="2"
                            >
                              <FiX />
                            </Button>
                          </HStack>
                        </Box>
                      ))}
                      <Button
                        type="button"
                        variant="subtle"
                        onClick={() => preferredFieldArray.append({ value: "" })}
                        alignSelf="flex-start"
                      >
                        Add preference
                      </Button>
                    </VStack>
                  </Field>
                  <Field label="Salary minimum">
                    <Input
                      type="number"
                      {...createListingForm.register("salary_min")}
                    />
                  </Field>
                  <Field label="Salary maximum">
                    <Input
                      type="number"
                      {...createListingForm.register("salary_max")}
                    />
                  </Field>
                  <Field label="Expiration date">
                    <Input
                      type="date"
                      {...createListingForm.register("expires_on")}
                    />
                  </Field>
                  <Button type="submit" loading={createListing.isPending}>
                    Publish job
                  </Button>
                </VStack>
              </form>

              <DialogRoot
                open={aiDialogOpen}
                onOpenChange={({ open }) => {
                  if (!open) {
                    resetParseState()
                  } else {
                    setAiDialogOpen(true)
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Fill in with AI</DialogTitle>
                  </DialogHeader>
                  <DialogBody>
                    <VStack gap="4">
                      <Field label="Source type">
                        <RadioGroup
                          value={parseMode}
                          onValueChange={({ value }) =>
                            setParseMode(value as "text" | "file")
                          }
                        >
                          <HStack gap="2">
                            <Radio value="text">Paste description</Radio>
                            <Radio value="file">Upload document</Radio>
                          </HStack>
                        </RadioGroup>
                      </Field>
                      {parseMode === "text" ? (
                        <Field label="Job description">
                          <Textarea
                            value={parseTextInput}
                            onChange={(event) => setParseTextInput(event.target.value)}
                            minH="160px"
                          />
                        </Field>
                      ) : (
                        <Field label="Job listing file">
                          <Input
                            type="file"
                            accept=".txt,.pdf,.doc,.docx"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              setParseFile(file ?? null)
                            }}
                          />
                        </Field>
                      )}
                    </VStack>
                  </DialogBody>
                  <DialogFooter gap={2}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resetParseState()}
                      disabled={
                        parseTextMutation.isPending || parseFileMutation.isPending
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      loading={
                        parseMode === "text"
                          ? parseTextMutation.isPending
                          : parseFileMutation.isPending
                      }
                      onClick={() => {
                        if (parseMode === "text") {
                          if (!parseTextInput.trim()) {
                            showErrorToast("Add a job description to parse.")
                            return
                          }
                          parseTextMutation.mutate({ text: parseTextInput })
                        } else {
                          if (!parseFile) {
                            showErrorToast("Choose a file to parse.")
                            return
                          }
                          parseFileMutation.mutate({ file: parseFile })
                        }
                      }}
                    >
                      Generate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </DialogRoot>
            </VStack>
          </CardShell>
        )}

        {selectedJob && user?.role === "APPLICANT" && (
          <CardShell colors={colors}>
            <VStack align="stretch" gap="5">
              <VStack align="flex-start" gap="1">
                <Heading size="md">Apply to {selectedJob.title}</Heading>
                <Text color={colors.muted}>
                  {selectedJob.company_name} • {selectedJob.location}
                </Text>
              </VStack>
              <form onSubmit={submitApplication}>
                <VStack align="stretch" gap="4">
                  <VStack align="stretch" gap="2">
                    <Text fontWeight="semibold">Select a resume</Text>
                    {(resumes ?? []).length === 0 ? (
                      <Text color={colors.muted}>No resumes uploaded yet.</Text>
                    ) : (
                      <VStack align="stretch" gap="2">
                        {(resumes ?? []).map((resume) => (
                          <Button
                            key={resume.id}
                            type="button"
                            variant={resumeId === resume.id ? "solid" : "outline"}
                            onClick={() => setResumeId(resume.id)}
                          >
                            Uploaded {new Date(resume.created_at).toLocaleDateString()}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setResumeId("")}
                        >
                          Apply without a resume
                        </Button>
                      </VStack>
                    )}
                  </VStack>
                  <Field label="Cover letter">
                    <Textarea
                      value={coverLetter}
                      onChange={(event) => setCoverLetter(event.target.value)}
                    />
                  </Field>
                  <HStack gap="3" flexWrap="wrap">
                    <Button type="submit" loading={applicantApplication.isPending}>
                      Submit application
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedJob(null)}
                    >
                      Cancel
                    </Button>
                  </HStack>
                </VStack>
              </form>
            </VStack>
          </CardShell>
        )}

        <VStack align="stretch" gap="4">
          <Field label="Search jobs">
            <Input
              placeholder="Search by title, company, or location"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Field>
          {isLoading && <Text color={colors.muted}>Loading job listings...</Text>}
          {!isLoading && !hasJobListings && (
            <Text color={colors.muted}>No job listings found.</Text>
          )}
          {!isLoading && hasJobListings && filteredJobs.length === 0 && (
            <Text color={colors.muted}>
              No job listings match "{searchQuery.trim()}".
            </Text>
          )}
          {!isLoading &&
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                colors={colors}
                salaryLabel={formatSalaryRange(job.salary_min, job.salary_max)}
                onApply={handleApply}
                userRole={user?.role}
              />
            ))}
        </VStack>
      </VStack>
    </Box>
  )
}

type JobCardProps = {
  job: JobListingRead
  colors: ColorTokens
  salaryLabel?: string
  onApply: (job: JobListingRead) => void
  userRole?: string | null
}

function JobCard({ job, colors, salaryLabel, onApply, userRole }: JobCardProps) {
  const jobTypeLabel =
    jobTypeOptions.find((option) => option.value === job.job_type)?.label ?? job.job_type

  return (
    <CardShell colors={colors}>
      <VStack align="stretch" gap="3">
        <VStack align="stretch" gap="1">
          <Heading size="md">
            <Link to="/job/$jobId" params={{ jobId: job.id }}>
              {job.title}
            </Link>
          </Heading>
          <Text color={colors.muted}>
            {job.company_name}
            {job.location ? ` • ${job.location}` : ""}
          </Text>
        </VStack>

        <HStack gap="2" flexWrap="wrap">
          {jobTypeLabel && (
            <Badge colorPalette="gray" variant="subtle">
              {jobTypeLabel}
            </Badge>
          )}
          {job.is_remote && (
            <Badge colorPalette="green" variant="subtle">
              Remote
            </Badge>
          )}
          {salaryLabel && <Text color={colors.muted}>Salary: {salaryLabel}</Text>}
          {job.expires_on && (
            <Text color={colors.muted}>
              Closes {new Date(job.expires_on).toLocaleDateString()}
            </Text>
          )}
        </HStack>

        {job.description && (
          <Text color={colors.muted} lineClamp={3}>
            {job.description}
          </Text>
        )}

        <Flex
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap="3"
        >
          {userRole === "COMPANY" && (
            <Text color={colors.muted}>
              Status: {job.is_active ? "Active" : "Inactive"}
            </Text>
          )}
          <HStack gap="2">
            <Button as={Link} to={`/job/${job.id}`} variant="outline">
              View details
            </Button>
            {userRole === "APPLICANT" && (
              <Button type="button" onClick={() => onApply(job)}>
                Apply
              </Button>
            )}
          </HStack>
        </Flex>
      </VStack>
    </CardShell>
  )
}

type CardShellProps = {
  children: ReactNode
  colors: ColorTokens
}

function CardShell({ children, colors }: CardShellProps) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={{ base: "4", md: "6" }}
      bg={colors.cardBg}
      borderColor={colors.border}
      shadow="sm"
    >
      {children}
    </Box>
  )
}

type ColorTokens = {
  muted: string
  cardBg: string
  softBg: string
  border: string
}
