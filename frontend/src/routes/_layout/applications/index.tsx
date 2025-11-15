import { Badge, Box, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import { useMemo, useState, type ReactNode } from "react"

import type {
  JobApplicationRead,
  JobApplicationStatusEnum,
  JobListing,
  JobListingRead,
} from "@/client"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useApplicationsQuery, useUpdateApplicationStatusMutation } from "@/queries/applications"
import { useJobListingsQuery } from "@/queries/jobs"
import {
  jobApplicationStatusLabels,
  jobApplicationStatusOrder,
  jobApplicationStatusPalette,
} from "@/utils/job-application-status"

export const Route = createFileRoute("/_layout/applications/")({
  component: ApplicationsIndexPage,
})

function ApplicationsIndexPage() {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const themeMode = resolvedTheme === "dark" ? "dark" : "light"
  const colors: ColorTokens = {
    muted: themeMode === "dark" ? "gray.300" : "gray.600",
    cardBg: themeMode === "dark" ? "gray.900" : "white",
    border: themeMode === "dark" ? "gray.700" : "gray.200",
  }

  const { data: applications, isLoading } = useApplicationsQuery()
  const { data: jobListings } = useJobListingsQuery()

  const jobById = useMemo(() => {
    const record = new Map<string, JobListingRead>()
    for (const job of jobListings ?? []) {
      record.set(job.id, job)
    }
    return record
  }, [jobListings])

  const isCompany = user?.role === "COMPANY"
  const records = applications ?? []

  return (
    <Box mx="auto" maxW="6xl" px={{ base: "4", md: "6" }} py={{ base: "6", md: "8" }}>
      <VStack align="stretch" gap={{ base: "6", md: "8" }}>
        <VStack align="stretch" gap="2" textAlign="center">
          <Heading size="lg">Applications</Heading>
          <Text color={colors.muted}>
            Track submitted job applications and review their current status.
          </Text>
        </VStack>

        {isLoading && (
          <CardShell colors={colors}>
            <Text color={colors.muted}>Loading applications...</Text>
          </CardShell>
        )}

        {!isLoading && records.length === 0 && (
          <CardShell colors={colors}>
            <Text color={colors.muted}>No applications found.</Text>
          </CardShell>
        )}

        {!isLoading && records.length > 0 && isCompany && (
          <CompanyApplicationSections applications={records} jobById={jobById} colors={colors} />
        )}

        {!isLoading && records.length > 0 && !isCompany && (
          <ApplicantApplicationList applications={records} jobById={jobById} colors={colors} />
        )}
      </VStack>
    </Box>
  )
}

type ApplicationListProps = {
  applications: JobApplicationRead[]
  jobById: Map<string, JobListingRead>
  colors: ColorTokens
}

function CompanyApplicationSections({ applications, jobById, colors }: ApplicationListProps) {
  const orderedStatuses = jobApplicationStatusOrder

  return (
    <VStack align="stretch" gap={{ base: "5", md: "6" }}>
      {orderedStatuses.map((status) => {
        const items = sortApplicationsByScore(
          applications.filter((application) => application.status === status),
        )
        return (
          <CardShell key={status} colors={colors}>
            <VStack align="stretch" gap="4">
              <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="2">
                <Heading size="md">{jobApplicationStatusLabels[status]}</Heading>
                <Badge colorPalette={jobApplicationStatusPalette[status]} variant="subtle">
                  {items.length} application{items.length === 1 ? "" : "s"}
                </Badge>
              </HStack>
              <VStack align="stretch" gap="3">
                {items.length === 0 && (
                  <Text color={colors.muted}>No applications in this status.</Text>
                )}
                {items.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    job={application.job_listing ?? jobById.get(application.job_listing_id)}
                    colors={colors}
                    variant="company"
                    statusActions={
                      status === "UNDER_REVIEW" ? (
                        <UnderReviewActions applicationId={application.id} />
                      ) : status === "INTERVIEW" ? (
                        <InterviewStageActions applicationId={application.id} />
                      ) : undefined
                    }
                  />
                ))}
              </VStack>
            </VStack>
          </CardShell>
        )
      })}
    </VStack>
  )
}

function ApplicantApplicationList({ applications, jobById, colors }: ApplicationListProps) {
  return (
    <VStack align="stretch" gap="4">
      {applications.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          job={application.job_listing ?? jobById.get(application.job_listing_id)}
          colors={colors}
          variant="applicant"
        />
      ))}
    </VStack>
  )
}

const getApplicationScore = (application: JobApplicationRead) => {
  const rawScore = application.screen?.score
  if (rawScore === undefined || rawScore === null) {
    return null
  }
  const normalizedScore = typeof rawScore === "number" ? rawScore : Number(rawScore)
  return Number.isNaN(normalizedScore) ? null : normalizedScore
}

const sortApplicationsByScore = (applications: JobApplicationRead[]) => {
  return applications.slice().sort((a, b) => {
    const scoreA = getApplicationScore(a)
    const scoreB = getApplicationScore(b)
    if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
      return scoreB - scoreA
    }
    if (scoreA !== null && scoreB === null) {
      return -1
    }
    if (scoreA === null && scoreB !== null) {
      return 1
    }
    const createdA = new Date(a.created_at).getTime()
    const createdB = new Date(b.created_at).getTime()
    return createdB - createdA
  })
}

type ApplicationCardProps = {
  application: JobApplicationRead
  job: JobListing | JobListingRead | undefined
  colors: ColorTokens
  variant: "company" | "applicant"
  statusActions?: ReactNode
}

function ApplicationCard({ application, job, colors, variant, statusActions }: ApplicationCardProps) {
  const status = application.status
  const palette = jobApplicationStatusPalette[status]
  const statusLabel = jobApplicationStatusLabels[status]
  const submittedOn = new Date(application.created_at).toLocaleString()

  return (
    <CardShell colors={colors}>
      <VStack align="stretch" gap="3">
        <HStack justifyContent="space-between" alignItems="baseline" flexWrap="wrap" gap="2">
          <Heading size="sm">{job?.title ?? "Job"}</Heading>
          <Badge colorPalette={palette} variant="solid">
            {statusLabel}
          </Badge>
        </HStack>
        {job && (
          <Text color={colors.muted}>
            {job.company_name}
            {job.location ? ` • ${job.location}` : ""}
          </Text>
        )}
        {variant === "company" && (
          <VStack align="stretch" gap="1">
            <Text color={colors.muted}>
              Applicant: {application.applicant?.full_name ?? "Unknown"}
            </Text>
            {application.applicant?.email && (
              <Text color={colors.muted}>Email: {application.applicant.email}</Text>
            )}
          </VStack>
        )}
        <Text color={colors.muted}>Submitted on {submittedOn}</Text>
        <Flex justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="3">
          <ButtonLink to={`/applications/${application.id}`}>
            View details
          </ButtonLink>
          {variant === "applicant" && application.cover_letter && (
            <Text color={colors.muted} fontSize="sm">
              Cover letter attached
            </Text>
          )}
        </Flex>
        {statusActions ? <Box pt="2">{statusActions}</Box> : null}
      </VStack>
    </CardShell>
  )
}

type UnderReviewActionsProps = {
  applicationId: string
}

function UnderReviewActions({ applicationId }: UnderReviewActionsProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [pendingStatus, setPendingStatus] = useState<JobApplicationStatusEnum | null>(null)
  const updateStatus = useUpdateApplicationStatusMutation({
    onSuccess: (_, variables) => {
      if (variables?.status === "INTERVIEW") {
        showSuccessToast("Application moved to interview.")
      } else if (variables?.status === "REJECTED") {
        showSuccessToast("Application marked as rejected.")
      } else {
        showSuccessToast("Application status updated.")
      }
    },
    onError: () => {
      showErrorToast("Could not update the application status.")
    },
    onSettled: () => {
      setPendingStatus(null)
    },
  })

  const handleUpdateStatus = (status: JobApplicationStatusEnum) => {
    setPendingStatus(status)
    updateStatus.mutate({ applicationId, status })
  }

  return (
    <HStack gap="3" flexWrap="wrap">
      <Button
        size="sm"
        colorPalette="purple"
        loading={updateStatus.isPending && pendingStatus === "INTERVIEW"}
        disabled={updateStatus.isPending}
        onClick={() => handleUpdateStatus("INTERVIEW")}
      >
        Move to interview
      </Button>
      <Button
        size="sm"
        colorPalette="red"
        variant="outline"
        loading={updateStatus.isPending && pendingStatus === "REJECTED"}
        disabled={updateStatus.isPending}
        onClick={() => handleUpdateStatus("REJECTED")}
      >
        Reject application
      </Button>
    </HStack>
  )
}

type InterviewStageActionsProps = {
  applicationId: string
}

function InterviewStageActions({ applicationId }: InterviewStageActionsProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [pendingStatus, setPendingStatus] = useState<JobApplicationStatusEnum | null>(null)
  const updateStatus = useUpdateApplicationStatusMutation({
    onSuccess: (_, variables) => {
      if (variables?.status === "ACCEPTED") {
        showSuccessToast("Application marked as accepted.")
      } else if (variables?.status === "REJECTED") {
        showSuccessToast("Application marked as rejected.")
      } else {
        showSuccessToast("Application status updated.")
      }
    },
    onError: () => {
      showErrorToast("Could not update the application status.")
    },
    onSettled: () => {
      setPendingStatus(null)
    },
  })

  const handleUpdateStatus = (status: JobApplicationStatusEnum) => {
    setPendingStatus(status)
    updateStatus.mutate({ applicationId, status })
  }

  return (
    <HStack gap="3" flexWrap="wrap">
      <Button
        size="sm"
        colorPalette="green"
        loading={updateStatus.isPending && pendingStatus === "ACCEPTED"}
        disabled={updateStatus.isPending}
        onClick={() => handleUpdateStatus("ACCEPTED")}
      >
        Mark as accepted
      </Button>
      <Button
        size="sm"
        colorPalette="red"
        variant="outline"
        loading={updateStatus.isPending && pendingStatus === "REJECTED"}
        disabled={updateStatus.isPending}
        onClick={() => handleUpdateStatus("REJECTED")}
      >
        Reject application
      </Button>
    </HStack>
  )
}

type ButtonLinkProps = {
  to: string
  params?: Record<string, string>
  children: ReactNode
}

function ButtonLink({ to, params, children }: ButtonLinkProps) {
  return (
    <Link to={to} params={params}>
      <Text as="span" color="colorPalette.600" fontWeight="semibold">
        {children}
      </Text>
    </Link>
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
  border: string
}
