import { Box, Flex, Heading, Input, Stack, Text, Textarea } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMemo, useState, type DragEvent, type FormEvent } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"

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
import useCustomToast from "@/hooks/useCustomToast"
import useAuth from "@/hooks/useAuth"
import { useSubmitApplicationMutation } from "@/queries/applications"
import {
  useCreateJobListingMutation,
  useJobListingsQuery,
  useParseJobListingFileMutation,
  useParseJobListingMutation,
} from "@/queries/jobs"
import { useResumesQuery } from "@/queries/resumes"
import { FiX } from "react-icons/fi"

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
  const { user } = useAuth()
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
  const { showSuccessToast, showErrorToast } = useCustomToast()

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

  return (
    <Stack gap={8}>
      <Heading size="lg">Jobs</Heading>

      {user?.role === "COMPANY" && (
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Heading size="md">Create a job listing</Heading>
          <Stack direction="row" gap={3} mt={4}>
            <Button onClick={() => setAiDialogOpen(true)} type="button">
              Fill in with AI
            </Button>
          </Stack>
          <form onSubmit={createListingForm.handleSubmit(handleCreateListing)}>
            <Stack gap={4} mt={4}>
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
                      <Stack direction="row" gap={2} flexWrap="wrap">
                        {jobTypeOptions.map((option) => (
                          <Radio key={option.value} value={option.value}>
                            {option.label}
                          </Radio>
                        ))}
                      </Stack>
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
                <Stack gap={2} w="full">
                  {minimumFields.map((field, index) => (
                    <Box
                      key={field.id}
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                      w="full"
                      draggable
                      onDragStart={(event) =>
                        minimumDragHandlers.onDragStart(event, index)
                      }
                      onDragOver={minimumDragHandlers.onDragOver}
                      onDrop={(event) =>
                        minimumDragHandlers.onDrop(event, index)
                      }
                    >
                      <Flex gap={3} align="center" w="full">
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
                          px={2}
                        >
                          <FiX />
                        </Button>
                      </Flex>
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
                </Stack>
              </Field>
              <Field
                label="Preferred qualifications"
                helperText="Add each preference and drag to reorder."
                w="full"
              >
                <Stack gap={2} w="full">
                  {preferredFields.map((field, index) => (
                    <Box
                      key={field.id}
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                      w="full"
                      draggable
                      onDragStart={(event) =>
                        preferredDragHandlers.onDragStart(event, index)
                      }
                      onDragOver={preferredDragHandlers.onDragOver}
                      onDrop={(event) =>
                        preferredDragHandlers.onDrop(event, index)
                      }
                    >
                      <Flex gap={3} align="center" w="full">
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
                          px={2}
                        >
                          <FiX />
                        </Button>
                      </Flex>
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
                </Stack>
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
            </Stack>
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
                <Stack gap={4}>
                  <Field label="Source type">
                    <RadioGroup
                      value={parseMode}
                      onValueChange={({ value }) =>
                        setParseMode(value as "text" | "file")
                      }
                    >
                      <Stack direction="row" gap={2}>
                        <Radio value="text">Paste description</Radio>
                        <Radio value="file">Upload document</Radio>
                      </Stack>
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
                </Stack>
              </DialogBody>
              <DialogFooter gap={2}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetParseState()}
                  disabled={parseTextMutation.isPending || parseFileMutation.isPending}
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
        </Box>
      )}

      {selectedJob && user?.role === "APPLICANT" && (
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Heading size="md">Apply to {selectedJob.title}</Heading>
          <form onSubmit={submitApplication}>
            <Stack gap={4} mt={4}>
              <Stack gap={2}>
                <Text fontWeight="semibold">Select a resume</Text>
                {(resumes ?? []).length === 0 ? (
                  <Text>No resumes uploaded yet.</Text>
                ) : (
                  <Stack gap={2}>
                    {(resumes ?? []).map((resume) => (
                      <Button
                        key={resume.id}
                        type="button"
                        variant={resumeId === resume.id ? "solid" : "outline"}
                        onClick={() => setResumeId(resume.id)}
                      >
                        Uploaded{" "}
                        {new Date(resume.created_at).toLocaleDateString()}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setResumeId("")}
                    >
                      Apply without a resume
                    </Button>
                  </Stack>
                )}
              </Stack>
              <Field label="Cover letter">
                <Textarea
                  value={coverLetter}
                  onChange={(event) => setCoverLetter(event.target.value)}
                />
              </Field>
              <Stack direction="row" gap={3}>
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
              </Stack>
            </Stack>
          </form>
        </Box>
      )}

      <Stack gap={4}>
        {isLoading && <Text>Loading job listings...</Text>}
        {!isLoading && sortedJobs.length === 0 && (
          <Text>No job listings found.</Text>
        )}
        {sortedJobs.map((job) => (
          <Box key={job.id} borderWidth="1px" borderRadius="md" p={4}>
            <Stack gap={2}>
              <Heading size="md">
                <Link to="/job/$jobId" params={{ jobId: job.id }}>
                  {job.title}
                </Link>
              </Heading>
              <Text>{job.company_name}</Text>
              <Text>{job.location}</Text>
              {job.description && <Text>{job.description}</Text>}
              <Stack direction="row" gap={3}>
                {user?.role === "APPLICANT" && (
                  <Button type="button" onClick={() => handleApply(job)}>
                    Apply
                  </Button>
                )}
                {user?.role === "COMPANY" && (
                  <Text>Status: {job.is_active ? "Active" : "Inactive"}</Text>
                )}
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  )
}
