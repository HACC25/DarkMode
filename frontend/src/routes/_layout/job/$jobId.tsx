import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"
import { useJobListingsQuery } from "@/queries/jobs"

const jobTypeLabels: Record<string, string> = {
  FT: "Full time",
  PT: "Part time",
  CO: "Contract",
  IN: "Internship",
  TE: "Temporary",
}

export const Route = createFileRoute("/_layout/job/$jobId")({
  component: JobDetailPage,
})

function JobDetailPage() {
  const { jobId } = Route.useParams()
  const { data: jobs, isLoading } = useJobListingsQuery()
  const { user } = useAuth()

  if (isLoading) {
    return (
      <Stack gap={4}>
        <Text>Loading job details...</Text>
      </Stack>
    )
  }

  const job = jobs?.find((item) => item.id === jobId)

  if (!job) {
    return (
      <Stack gap={4}>
        <Text>We couldn&apos;t find that job.</Text>
        <Link to="/jobs">Go back to jobs</Link>
      </Stack>
    )
  }

  const jobType = job.job_type ? jobTypeLabels[job.job_type] : undefined
  const remoteLabel =
    job.is_remote === undefined ? undefined : job.is_remote ? "Yes" : "No"

  const salaryParts = [job.salary_min, job.salary_max].filter(Boolean)
  const salaryLabel =
    salaryParts.length === 0
      ? undefined
      : salaryParts.length === 1
        ? salaryParts[0]
        : `${salaryParts[0]} - ${salaryParts[1]}`

  return (
    <Stack gap={6}>
      <Stack gap={3}>
        <Heading size="lg">{job.title}</Heading>
        <Text fontWeight="semibold">{job.company_name}</Text>
        <Text>{job.location}</Text>
        {jobType && <Text>Job type: {jobType}</Text>}
        {remoteLabel && <Text>Remote: {remoteLabel}</Text>}
        {salaryLabel && <Text>Salary range: {salaryLabel}</Text>}
        {job.expires_on && (
          <Text>
            Expires on {new Date(job.expires_on).toLocaleDateString()}
          </Text>
        )}
      </Stack>

      <Box>
        <Heading size="md" mb={2}>
          Description
        </Heading>
        <Text whiteSpace="pre-wrap">{job.description}</Text>
      </Box>

      {(job.minimum_qualifications?.length ?? 0) > 0 && (
        <Box>
          <Heading size="md" mb={2}>
            Minimum qualifications
          </Heading>
          <Stack gap={1}>
            {job.minimum_qualifications?.map((item) => (
              <Text key={item}>• {item}</Text>
            ))}
          </Stack>
        </Box>
      )}

      {(job.preferred_qualifications?.length ?? 0) > 0 && (
        <Box>
          <Heading size="md" mb={2}>
            Preferred qualifications
          </Heading>
          <Stack gap={1}>
            {job.preferred_qualifications?.map((item) => (
              <Text key={item}>• {item}</Text>
            ))}
          </Stack>
        </Box>
      )}

      <Stack gap={3}>
        {user?.role === "APPLICANT" && (
          <Link to="/jobs">Ready to apply? Go back to the listings.</Link>
        )}
        <Link to="/jobs">Back to jobs</Link>
      </Stack>
    </Stack>
  )
}
