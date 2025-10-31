import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"

import type { JobApplicationRead, JobListingRead } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import useAuth from "@/hooks/useAuth"
import { useApplicationsQuery } from "@/queries/applications"
import { useCreateScreenMutation } from "@/queries/screens"
import { useJobListingsQuery } from "@/queries/jobs"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_layout/applications")({
  component: ApplicationsPage,
})

function ApplicationsPage() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { data: applications, isLoading } = useApplicationsQuery()
  const { data: jobListings } = useJobListingsQuery()

  const jobById = useMemo(() => {
    const record = new Map<string, JobListingRead>()
    for (const job of jobListings ?? []) {
      record.set(job.id, job)
    }
    return record
  }, [jobListings])

  const createScreen = useCreateScreenMutation({
    onSuccess: () => {
      showSuccessToast("Screen started.")
    },
    onError: () => {
      showErrorToast("Could not start screen.")
    },
  })

  const handleScreen = (application: JobApplicationRead) => {
    createScreen.mutate({
      application_id: application.id,
    })
  }

  return (
    <Stack gap={6}>
      <Heading size="lg">Applications</Heading>
      {isLoading && <Text>Loading applications...</Text>}
      {!isLoading && (applications ?? []).length === 0 && (
        <Text>No applications found.</Text>
      )}
      {(applications ?? []).map((application) => {
        const job = jobById.get(application.job_listing_id)
        return (
          <Box key={application.id} borderWidth="1px" borderRadius="md" p={4}>
            <Stack gap={2}>
              <Heading size="md">
                {job?.title || "Job"}
              </Heading>
              {job && (
                <Text>
                  {job.company_name} &mdash; {job.location}
                </Text>
              )}
              <Text>Status: {application.status}</Text>
              <Text>
                Submitted on{" "}
                {new Date(application.created_at).toLocaleString()}
              </Text>
              {user?.role === "COMPANY" && (
                <Button
                  onClick={() => handleScreen(application)}
                  loading={createScreen.isPending}
                >
                  Run screen
                </Button>
              )}
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}
