import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"

import type { JobApplicationRead, JobListingRead } from "@/client"
import useAuth from "@/hooks/useAuth"
import { useApplicationsQuery } from "@/queries/applications"
import { useJobListingsQuery } from "@/queries/jobs"

export const Route = createFileRoute("/_layout/applications/")({
  component: ApplicationsIndexPage,
})

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

function ApplicationsIndexPage() {
  const { user } = useAuth()
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

  return (
    <Stack>
      <Heading>Applications</Heading>
      {isLoading && <Text>Loading applications...</Text>}
      {!isLoading && (applications ?? []).length === 0 && (
        <Text>No applications found.</Text>
      )}
      {!isLoading && isCompany && (
        <CompanyApplicationSections
          applications={applications ?? []}
          jobById={jobById}
        />
      )}
      {!isLoading && !isCompany && (
        <ApplicantApplicationList
          applications={applications ?? []}
          jobById={jobById}
        />
      )}
    </Stack>
  )
}

type ApplicationListProps = {
  applications: JobApplicationRead[]
  jobById: Map<string, JobListingRead>
}

function CompanyApplicationSections({
  applications,
  jobById,
}: ApplicationListProps) {
  const orderedStatuses: JobApplicationRead["status"][] = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "REJECTED",
    "WITHDRAWN",
  ]

  return (
    <Stack>
      {orderedStatuses.map((status) => {
        const items = applications.filter(
          (application) => application.status === status,
        )

        return (
          <Stack key={status}>
            <Heading>{statusLabels[status]}</Heading>
            {items.length === 0 && (
              <Text>No applications in this status.</Text>
            )}
            {items.map((application) => {
              const job = jobById.get(application.job_listing_id)
              return (
                <Box key={application.id}>
                  <Stack>
                    <Link
                      to="/applications/$applicationId"
                      params={{ applicationId: application.id }}
                    >
                      {job?.title || "Job"}
                    </Link>
                    {job && (
                      <Text>
                        {job.company_name} - {job.location}
                      </Text>
                    )}
                    <Text>
                      Submitted on{" "}
                      {new Date(application.created_at).toLocaleString()}
                    </Text>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )
      })}
    </Stack>
  )
}

function ApplicantApplicationList({
  applications,
  jobById,
}: ApplicationListProps) {
  return (
    <Stack>
      {applications.map((application) => {
        const job = jobById.get(application.job_listing_id)
        return (
          <Box key={application.id}>
            <Stack>
              <Heading>
                {job?.title || "Job"}
              </Heading>
              {job && (
                <Text>
                  {job.company_name} - {job.location}
                </Text>
              )}
              <Text>Status: {application.status}</Text>
              <Text>
                Submitted on {new Date(application.created_at).toLocaleString()}
              </Text>
              <Link
                to="/applications/$applicationId"
                params={{ applicationId: application.id }}
              >
                View details
              </Link>
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}
