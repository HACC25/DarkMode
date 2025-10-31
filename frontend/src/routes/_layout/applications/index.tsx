import { Badge, Box, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import { useMemo, type ReactNode } from "react"

import type { JobApplicationRead, JobListingRead } from "@/client"
import useAuth from "@/hooks/useAuth"
import { useApplicationsQuery } from "@/queries/applications"
import { useJobListingsQuery } from "@/queries/jobs"

export const Route = createFileRoute("/_layout/applications/")({
  component: ApplicationsIndexPage,
})

const statusLabels: Record<JobApplicationRead["status"], string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

const statusPalette: Record<JobApplicationRead["status"], string> = {
  SUBMITTED: "blue",
  UNDER_REVIEW: "orange",
  REJECTED: "red",
  WITHDRAWN: "gray",
}

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
  const orderedStatuses: JobApplicationRead["status"][] = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "REJECTED",
    "WITHDRAWN",
  ]

  return (
    <VStack align="stretch" gap={{ base: "5", md: "6" }}>
      {orderedStatuses.map((status) => {
        const items = applications.filter((application) => application.status === status)
        return (
          <CardShell key={status} colors={colors}>
            <VStack align="stretch" gap="4">
              <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="2">
                <Heading size="md">{statusLabels[status]}</Heading>
                <Badge colorPalette={statusPalette[status]} variant="subtle">
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

type ApplicationCardProps = {
  application: JobApplicationRead
  job: JobListingRead | undefined
  colors: ColorTokens
  variant: "company" | "applicant"
}

function ApplicationCard({ application, job, colors, variant }: ApplicationCardProps) {
  const status = application.status
  const palette = statusPalette[status]
  const statusLabel = statusLabels[status]
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
          <ButtonLink
            to={`/applications/${application.id}`}
          >
            View details
          </ButtonLink>
          {variant === "applicant" && application.cover_letter && (
            <Text color={colors.muted} fontSize="sm">
              Cover letter attached
            </Text>
          )}
        </Flex>
      </VStack>
    </CardShell>
  )
}

type ButtonLinkProps = {
  to: string
  params?: Record<string, string>
  children: ReactNode
}

function ButtonLink({ to, params, children }: ButtonLinkProps) {
  return (
    <Text as={Link} to={to} params={params} color="colorPalette.600" fontWeight="semibold">
      {children}
    </Text>
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
