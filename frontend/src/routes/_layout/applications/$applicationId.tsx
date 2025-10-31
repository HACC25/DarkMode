import { Box, Flex, Heading, Table, Text, VStack } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import type { ReactNode } from "react"

import type { ScreeningReason } from "@/client"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useApplicationQuery } from "@/queries/applications"
import { useJobListingsQuery } from "@/queries/jobs"
import { useCreateScreenMutation } from "@/queries/screens"

export const Route = createFileRoute("/_layout/applications/$applicationId")({
  component: ApplicationDetailPage,
})

function ApplicationDetailPage() {
  const { applicationId } = Route.useParams()
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { data: application, isLoading } = useApplicationQuery({ applicationId })
  const { data: jobs } = useJobListingsQuery()
  const { resolvedTheme } = useTheme()

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
      <Box mx="auto" maxW="6xl" px={{ base: "4", md: "6" }} py="10">
        <VStack align="center" gap="4">
          <Text>Loading application...</Text>
        </VStack>
      </Box>
    )
  }

  if (!application) {
    return (
      <Box mx="auto" maxW="6xl" px={{ base: "4", md: "6" }} py="10">
        <VStack align="center" gap="4">
          <Text>We could not find that application.</Text>
          <Link to="/applications">Back to applications</Link>
        </VStack>
      </Box>
    )
  }

  const job = application.job_listing ?? jobs?.find((item) => item.id === application.job_listing_id)
  const applicant = application.applicant
  const resume = application.resume
  const screen = application.screen
  const themeMode = resolvedTheme === "dark" ? "dark" : "light"
  const colors: ColorTokens = {
    muted: themeMode === "dark" ? "gray.300" : "gray.600",
    cardBg: themeMode === "dark" ? "gray.900" : "white",
    softBg: themeMode === "dark" ? "gray.800" : "gray.50",
    border: themeMode === "dark" ? "gray.700" : "gray.200",
  }

  const handleScreen = () => {
    createScreen.mutate({
      application_id: application.id,
    })
  }

  return (
    <Box mx="auto" maxW="6xl" px={{ base: "4", md: "6" }} py={{ base: "6", md: "8" }}>
      <VStack align="stretch" gap={{ base: "6", md: "8" }}>
        <VStack gap="2" textAlign="center">
          <Heading size="lg">Application details</Heading>
          <Text color={colors.muted}>
            Review the application summary, screening activity, and supporting documents.
          </Text>
        </VStack>

        <Flex direction={{ base: "column", lg: "row" }} gap={{ base: "4", lg: "6" }}>
          <SummaryCard
            title="Application"
            items={[
              { label: "Status", value: application.status },
              { label: "Submitted", value: new Date(application.created_at).toLocaleString() },
              { label: "Updated", value: new Date(application.updated_at).toLocaleString() },
            ]}
            colors={colors}
          />
          <SummaryCard
            title="Applicant"
            items={[
              applicant.full_name ? { label: "Name", value: applicant.full_name } : null,
              { label: "Email", value: applicant.email },
              typeof applicant.role === "string" ? { label: "Role", value: applicant.role } : null,
            ].filter(Boolean) as SummaryCardItem[]}
            colors={colors}
          />
          <Box
            flex="1"
            borderWidth="1px"
            borderRadius="lg"
            p={{ base: "4", md: "6" }}
            bg={colors.cardBg}
            shadow="sm"
            borderColor={colors.border}
          >
            <Heading size="md" mb="3">
              Screening results
            </Heading>
            {screen ? (
              <VStack align="start" gap="2">
                {screen.created_at && (
                  <Text fontWeight="medium">
                    Ran on {new Date(screen.created_at).toLocaleString()}
                  </Text>
                )}
                {!screen.minimum_qualifications?.length && !screen.preferred_qualifications?.length ? (
                  <Text color={colors.muted}>No qualification feedback recorded.</Text>
                ) : (
                  <Text color={colors.muted}>
                    Review detailed feedback in the qualifications comparison below.
                  </Text>
                )}
              </VStack>
            ) : (
              <Text color={colors.muted}>No screening results yet.</Text>
            )}
          </Box>
        </Flex>

        <Box
          borderWidth="1px"
          borderRadius="lg"
          p={{ base: "4", md: "6" }}
          bg={colors.cardBg}
          shadow="sm"
          borderColor={colors.border}
        >
          <VStack align="stretch" gap="3">
            <VStack gap="1" textAlign="center">
              <Heading size="md">Job</Heading>
              <Text color={colors.muted}>Details for the role connected to this application.</Text>
            </VStack>
            <VStack align="stretch" gap="2">
              <Text fontWeight="semibold">{job?.title ?? "Job"}</Text>
              {job?.company_name && <Text color={colors.muted}>Company: {job.company_name}</Text>}
              {job?.location && <Text color={colors.muted}>Location: {job.location}</Text>}
              {job?.description && (
                <Box borderWidth="1px" borderRadius="md" p="4" bg={colors.softBg} borderColor={colors.border}>
                  <Text whiteSpace="pre-wrap">{job.description}</Text>
                </Box>
              )}
            </VStack>
          </VStack>
        </Box>

        <QualificationsComparison
          minimumRequirements={job?.minimum_qualifications ?? []}
          preferredRequirements={job?.preferred_qualifications ?? []}
          minimumEvaluations={screen?.minimum_qualifications ?? []}
          preferredEvaluations={screen?.preferred_qualifications ?? []}
          colors={colors}
        />

        {resume && (
          <Box
            borderWidth="1px"
            borderRadius="lg"
            p={{ base: "4", md: "6" }}
            bg={colors.cardBg}
            shadow="sm"
            borderColor={colors.border}
          >
            <VStack gap="3" align="stretch">
              <Heading size="md" textAlign="center">
                Resume
              </Heading>
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
              {/*{resume.text_content && (<Text whiteSpace="pre-wrap">{resume.text_content}</Text>)}*/}
            </VStack>
          </Box>
        )}

        {application.cover_letter && (
          <Box
            borderWidth="1px"
            borderRadius="lg"
            p={{ base: "4", md: "6" }}
            bg={colors.cardBg}
            shadow="sm"
            borderColor={colors.border}
          >
            <VStack align="stretch" gap="3">
              <Heading size="md" textAlign="center">
                Cover letter
              </Heading>
              <Text whiteSpace="pre-wrap">{application.cover_letter}</Text>
            </VStack>
          </Box>
        )}

        <Flex justify="space-between" wrap="wrap" gap="3">
          <Button as={Link} to="/applications" variant="outline">
            Back to applications
          </Button>
          {user?.role === "COMPANY" && application.status === "SUBMITTED" && (
            <Button onClick={handleScreen} loading={createScreen.isPending} colorPalette="gray">
              Run screen
            </Button>
          )}
        </Flex>
      </VStack>
    </Box>
  )
}

type QualificationsComparisonProps = {
  minimumRequirements: string[]
  preferredRequirements: string[]
  minimumEvaluations: ScreeningReason[]
  preferredEvaluations: ScreeningReason[]
  colors: ColorTokens
}

const statusLabel: Record<string, string> = {
  HIGHLY_QUALIFIED: "Highly qualified",
  QUALIFIED: "Qualified",
  MEETS: "Meets expectations",
  NOT_QUALIFIED: "Not qualified",
}

const statusColor: Record<string, string> = {
  HIGHLY_QUALIFIED: "green.500",
  QUALIFIED: "green.400",
  MEETS: "blue.400",
  NOT_QUALIFIED: "red.400",
}

function QualificationsComparison({
  minimumRequirements,
  preferredRequirements,
  minimumEvaluations,
  preferredEvaluations,
  colors,
}: QualificationsComparisonProps) {
  const renderRows = (requirements: string[], evaluations: ScreeningReason[]) => {
    if (requirements.length === 0) {
      return (
        <Table.Row>
          <Table.Cell colSpan={2} width="50%">
            <Text color={colors.muted}>No requirements listed.</Text>
          </Table.Cell>
        </Table.Row>
      )
    }

    return requirements.map((requirement, index) => {
      const evaluation =
        evaluations[index] ??
        evaluations.find((item) =>
          item.reason.toLowerCase().includes(requirement.toLowerCase()),
        )
      const status = evaluation?.status
      const fallback = colors.muted
      const label = status ? statusLabel[status] ?? status : "Not evaluated"
      const color = status ? statusColor[status] ?? fallback : fallback

      return (
        <Table.Row key={`${requirement}-${index}`}>
          <Table.Cell width="50%">
            <Text whiteSpace="pre-wrap">{requirement}</Text>
          </Table.Cell>
          <Table.Cell width="50%">
            <Text color={color} fontWeight="medium">
              {label}
            </Text>
            {evaluation?.reason && (
              <Text color={colors.muted} whiteSpace="pre-wrap">
                {evaluation.reason}
              </Text>
            )}
          </Table.Cell>
        </Table.Row>
      )
    })
  }

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={{ base: "4", md: "6" }}
      bg={colors.cardBg}
      shadow="sm"
      borderColor={colors.border}
    >
      <VStack align="stretch" gap="4">
        <Heading size="md" textAlign="center">
          Qualifications comparison
        </Heading>
        <VStack align="stretch" gap="3">
          <SectionTable
            title="Minimum qualifications"
            rows={renderRows(minimumRequirements, minimumEvaluations)}
            colors={colors}
          />
          <SectionTable
            title="Preferred qualifications"
            rows={renderRows(preferredRequirements, preferredEvaluations)}
            colors={colors}
          />
        </VStack>
      </VStack>
    </Box>
  )
}

type SummaryCardItem = {
  label: string
  value: string
}

type SummaryCardProps = {
  title: string
  items: SummaryCardItem[]
  colors: ColorTokens
}

function SummaryCard({ title, items, colors }: SummaryCardProps) {
  return (
    <Box
      flex="1"
      borderWidth="1px"
      borderRadius="lg"
      p={{ base: "4", md: "6" }}
      bg={colors.cardBg}
      shadow="sm"
      borderColor={colors.border}
    >
      <Heading size="md" mb="3">
        {title}
      </Heading>
      <VStack align="stretch" gap="2">
        {items.length ? (
          items.map((item) => (
            <Box key={`${title}-${item.label}`}>
              <Text fontWeight="medium">{item.label}</Text>
              <Text color={colors.muted}>{item.value}</Text>
            </Box>
          ))
        ) : (
          <Text color={colors.muted}>No information provided.</Text>
        )}
      </VStack>
    </Box>
  )
}

type SectionTableProps = {
  title: string
  rows: ReactNode
  colors: ColorTokens
}

function SectionTable({ title, rows, colors }: SectionTableProps) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={{ base: "4", md: "5" }}
      bg={colors.softBg}
      borderColor={colors.border}
    >
      <VStack align="stretch" gap="3">
        <Text fontWeight="semibold">{title}</Text>
        <Table.Root variant="line" size="md">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader width="50%">Requirement</Table.ColumnHeader>
              <Table.ColumnHeader width="50%">Applicant result</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>{rows}</Table.Body>
        </Table.Root>
      </VStack>
    </Box>
  )
}

type ColorTokens = {
  muted: string
  cardBg: string
  softBg: string
  border: string
}
