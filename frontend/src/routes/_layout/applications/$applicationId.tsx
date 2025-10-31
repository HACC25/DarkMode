import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"

import type { ScreeningReason } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import useAuth from "@/hooks/useAuth"
import { useApplicationQuery } from "@/queries/applications"
import { useJobListingsQuery } from "@/queries/jobs"
import { useCreateScreenMutation } from "@/queries/screens"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_layout/applications/$applicationId")({
  component: ApplicationDetailPage,
})

function ApplicationDetailPage() {
  const { applicationId } = Route.useParams()
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { data: application, isLoading } = useApplicationQuery({
    applicationId,
  })
  const { data: jobs } = useJobListingsQuery()

  const createScreen = useCreateScreenMutation({
    onSuccess: () => {
      showSuccessToast("Screen started.")
    },
    onError: () => {
      showErrorToast("Could not start screen.")
    },
  })

  if (isLoading) {
    return (
      <Stack>
        <Text>Loading application...</Text>
      </Stack>
    )
  }

  if (!application) {
    return (
      <Stack>
        <Text>We could not find that application.</Text>
        <Link to="/applications">Back to applications</Link>
      </Stack>
    )
  }

  const job = application.job_listing ?? jobs?.find((item) => item.id === application.job_listing_id)
  const applicant = application.applicant
  const resume = application.resume
  const screen = application.screen

  const handleScreen = () => {
    createScreen.mutate({
      application_id: application.id,
    })
  }

  return (
    <Stack>
      <div style={{ textAlign: "center" }}>
        <Heading>Application details</Heading>
      </div>
      <Box>
        <table style={{ width: "100%" }}>
          <colgroup>
            <col width="33%" />
            <col width="33%" />
            <col width="34%" />
          </colgroup>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top" }}>
                <Heading>Application</Heading>
                <Stack>
                  <Text>Status: {application.status}</Text>
                  <Text>
                    Submitted on {new Date(application.created_at).toLocaleString()}
                  </Text>
                  <Text>
                    Last updated {new Date(application.updated_at).toLocaleString()}
                  </Text>
                </Stack>
              </td>
              <td style={{ verticalAlign: "top" }}>
                <Heading>Applicant</Heading>
                <Stack>
                  {applicant.full_name && <Text>Name: {applicant.full_name}</Text>}
                  <Text>Email: {applicant.email}</Text>
                  {typeof applicant.role === "string" && (
                    <Text>Role: {applicant.role}</Text>
                  )}
                </Stack>
              </td>
              <td style={{ verticalAlign: "top" }}>
                <Heading>Screening results</Heading>
                {screen ? (
                  <Stack>
                    {screen.created_at && (
                      <Text>
                        Ran on {new Date(screen.created_at).toLocaleString()}
                      </Text>
                    )}
                    {!screen.minimum_qualifications?.length &&
                      !screen.preferred_qualifications?.length && (
                        <Text>No qualification feedback recorded.</Text>
                      )}
                  </Stack>
                ) : (
                  <Text>No screening results yet.</Text>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </Box>
      <Box>
        <div style={{ textAlign: "center" }}>
          <Heading>Job</Heading>
        </div>
        <Stack>
          <Text>Title: {job?.title ?? "Job"}</Text>
          {job?.company_name && <Text>Company: {job.company_name}</Text>}
          {job?.location && <Text>Location: {job.location}</Text>}
          {job?.description && (
            <Text whiteSpace="pre-wrap">{job.description}</Text>
          )}
        </Stack>
      </Box>
      <QualificationsComparison
        minimumRequirements={job?.minimum_qualifications ?? []}
        preferredRequirements={job?.preferred_qualifications ?? []}
        minimumEvaluations={screen?.minimum_qualifications ?? []}
        preferredEvaluations={screen?.preferred_qualifications ?? []}
      />
      {resume && (
        <Box>
          <div style={{ textAlign: "center" }}>
            <Heading>Resume</Heading>
          </div>
          <Stack>
            {resume.file_id && (
              <Button
                as="a"
                href={`/api/v1/files/${resume.file_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View original resume
              </Button>
            )}
            {/*{resume.text_content && (*/}
            {/*  <Text whiteSpace="pre-wrap">{resume.text_content}</Text>*/}
            {/*)}*/}
          </Stack>
        </Box>
      )}
      {application.cover_letter && (
        <Box>
          <div style={{ textAlign: "center" }}>
            <Heading>Cover letter</Heading>
          </div>
          <Text whiteSpace="pre-wrap">{application.cover_letter}</Text>
        </Box>
      )}
      {user?.role === "COMPANY" && application.status === "SUBMITTED" && (
        <Button onClick={handleScreen} loading={createScreen.isPending}>
          Run screen
        </Button>
      )}
      <Link to="/applications">Back to applications</Link>
    </Stack>
  )
}

type QualificationsComparisonProps = {
  minimumRequirements: string[]
  preferredRequirements: string[]
  minimumEvaluations: ScreeningReason[]
  preferredEvaluations: ScreeningReason[]
}

const statusLabel: Record<string, string> = {
  HIGHLY_QUALIFIED: "Highly qualified",
  QUALIFIED: "Qualified",
  MEETS: "Meets expectations",
  NOT_QUALIFIED: "Not qualified",
}

const statusColor: Record<string, string> = {
  HIGHLY_QUALIFIED: "green.600",
  QUALIFIED: "green.500",
  MEETS: "blue.600",
  NOT_QUALIFIED: "red.600",
}

function QualificationsComparison({
  minimumRequirements,
  preferredRequirements,
  minimumEvaluations,
  preferredEvaluations,
}: QualificationsComparisonProps) {
  const renderRows = (requirements: string[], evaluations: ScreeningReason[]) => {
    if (requirements.length === 0) {
      return (
        <tr>
          <td colSpan={2}>
            <Text>No requirements listed.</Text>
          </td>
        </tr>
      )
    }

    return requirements.map((requirement, index) => {
      const evaluation =
        evaluations[index] ??
        evaluations.find((item) =>
          item.reason.toLowerCase().includes(requirement.toLowerCase()),
        )
      const status = evaluation?.status
      const label = status ? statusLabel[status] ?? status : "Not evaluated"
      const color = status ? statusColor[status] ?? "gray.600" : "gray.600"

      return (
        <tr key={`${requirement}-${index}`}>
          <td>
            <Text whiteSpace="pre-wrap">{requirement}</Text>
          </td>
          <td>
            <Text color={color}>{label}</Text>
            {evaluation?.reason && (
              <Text whiteSpace="pre-wrap">{evaluation.reason}</Text>
            )}
          </td>
        </tr>
      )
    })
  }

  return (
    <Box>
      <div style={{ textAlign: "center" }}>
        <Heading>Qualifications comparison</Heading>
      </div>
      <Stack>
        <Box>
          <Heading>Minimum qualifications</Heading>
          <table>
            <colgroup>
              <col width="50%" />
              <col width="50%" />
            </colgroup>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Applicant result</th>
              </tr>
            </thead>
            <tbody>{renderRows(minimumRequirements, minimumEvaluations)}</tbody>
          </table>
        </Box>
        <Box>
          <Heading>Preferred qualifications</Heading>
          <table>
            <colgroup>
              <col width="50%" />
              <col width="50%" />
            </colgroup>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Applicant result</th>
              </tr>
            </thead>
            <tbody>{renderRows(preferredRequirements, preferredEvaluations)}</tbody>
          </table>
        </Box>
      </Stack>
    </Box>
  )
}
