import { Badge, Box, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import type { ReactNode } from "react"

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
  const { resolvedTheme } = useTheme()

  const mode = resolvedTheme === "dark" ? "dark" : "light"
  const colors: ColorTokens = {
    muted: mode === "dark" ? "gray.300" : "gray.600",
    cardBg: mode === "dark" ? "gray.900" : "white",
    border: mode === "dark" ? "gray.700" : "gray.200",
  }

  if (isLoading) {
    return (
      <PageShell>
        <VStack align="center" gap="4">
          <Text color={colors.muted}>Loading job details...</Text>
        </VStack>
      </PageShell>
    )
  }

  const job = jobs?.find((item) => item.id === jobId)

  if (!job) {
    return (
      <PageShell>
        <VStack align="center" gap="4">
          <Text color={colors.muted}>We could not find that job.</Text>
          <ButtonLink href="/jobs">Go back to jobs</ButtonLink>
        </VStack>
      </PageShell>
    )
  }

  const salaryLabel = formatSalaryRange(job.salary_min, job.salary_max)
  const jobTypeLabel = job.job_type ? jobTypeLabels[job.job_type] : undefined
  const remoteLabel =
    job.is_remote === undefined ? undefined : job.is_remote ? "Remote" : "Onsite"
  const closesLabel = job.expires_on
    ? new Date(job.expires_on).toLocaleDateString()
    : undefined

  const summaryItems: SummaryItem[] = [
    { label: "Company", value: job.company_name },
    { label: "Location", value: job.location },
    jobTypeLabel ? { label: "Job type", value: jobTypeLabel } : null,
    remoteLabel ? { label: "Work style", value: remoteLabel } : null,
    salaryLabel ? { label: "Salary range", value: salaryLabel } : null,
    closesLabel ? { label: "Application deadline", value: closesLabel } : null,
  ].filter(Boolean) as SummaryItem[]

  return (
    <PageShell>
      <VStack align="stretch" gap={{ base: "6", md: "8" }}>
        <VStack align="stretch" gap="3">
          <Heading size="lg">{job.title}</Heading>
          <HStack gap="2" flexWrap="wrap">
            <Badge colorPalette="gray" variant="subtle">
              {jobTypeLabel ?? "Role"}
            </Badge>
            {remoteLabel && (
              <Badge colorPalette="green" variant="subtle">
                {remoteLabel}
              </Badge>
            )}
            {job.is_active === false && (
              <Badge colorPalette="red" variant="subtle">
                Inactive
              </Badge>
            )}
          </HStack>
        </VStack>

        <CardShell colors={colors}>
          <VStack align="stretch" gap="4">
            {summaryItems.map((item) => (
              <Box key={item.label}>
                <Text fontWeight="medium">{item.label}</Text>
                <Text color={colors.muted}>{item.value}</Text>
              </Box>
            ))}
          </VStack>
        </CardShell>

        {job.description && (
          <CardShell colors={colors}>
            <VStack align="stretch" gap="3">
              <Heading size="md">Description</Heading>
              <Text color={colors.muted} whiteSpace="pre-wrap">
                {job.description}
              </Text>
            </VStack>
          </CardShell>
        )}

        {(job.minimum_qualifications?.length ?? 0) > 0 && (
          <CardShell colors={colors}>
            <VStack align="stretch" gap="3">
              <Heading size="md">Minimum qualifications</Heading>
              <VStack align="stretch" gap="2">
                {job.minimum_qualifications?.map((item) => (
                  <Text key={item} color={colors.muted}>
                    • {item}
                  </Text>
                ))}
              </VStack>
            </VStack>
          </CardShell>
        )}

        {(job.preferred_qualifications?.length ?? 0) > 0 && (
          <CardShell colors={colors}>
            <VStack align="stretch" gap="3">
              <Heading size="md">Preferred qualifications</Heading>
              <VStack align="stretch" gap="2">
                {job.preferred_qualifications?.map((item) => (
                  <Text key={item} color={colors.muted}>
                    • {item}
                  </Text>
                ))}
              </VStack>
            </VStack>
          </CardShell>
        )}

        <Flex justifyContent="space-between" flexWrap="wrap" gap="3">
          {user?.role === "APPLICANT" && (
            <ButtonLink href="/jobs">Ready to apply? Go back to the listings.</ButtonLink>
          )}
          <ButtonLink href="/jobs">Back to jobs</ButtonLink>
        </Flex>
      </VStack>
    </PageShell>
  )
}

function formatSalaryRange(
  min?: number | string | null,
  max?: number | string | null,
) {
  const parsedMin = typeof min === "string" ? Number(min) : min ?? undefined
  const parsedMax = typeof max === "string" ? Number(max) : max ?? undefined
  if (!parsedMin && !parsedMax) {
    return undefined
  }
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
  if (parsedMin && parsedMax) {
    return `${formatter.format(parsedMin)} – ${formatter.format(parsedMax)}`
  }
  if (parsedMin) {
    return `From ${formatter.format(parsedMin)}`
  }
  return `Up to ${formatter.format(parsedMax as number)}`
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <Box mx="auto" maxW="5xl" px={{ base: "4", md: "6" }} py={{ base: "6", md: "8" }}>
      {children}
    </Box>
  )
}

type ButtonLinkProps = {
  href: string
  children: ReactNode
}

function ButtonLink({ href, children }: ButtonLinkProps) {
  return (
    <Text as={Link} to={href} color="colorPalette.600" fontWeight="semibold">
      {children}
    </Text>
  )
}

type SummaryItem = {
  label: string
  value: string
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
