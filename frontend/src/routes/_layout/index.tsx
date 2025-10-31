import { Box, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"
import { useApplicationsQuery } from "@/queries/applications"
import { useJobListingsQuery } from "@/queries/jobs"
import { useResumesQuery } from "@/queries/resumes"
import { useScreensQuery } from "@/queries/screens"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()
  const { data: jobListings } = useJobListingsQuery()
  const { data: applications } = useApplicationsQuery()
  const { data: resumes } = useResumesQuery({
    enabled: user?.role === "APPLICANT",
  })
  const { data: screens } = useScreensQuery({
    enabled: user?.role === "COMPANY",
  })

  const applicantStats = [
    { label: "Open jobs", value: jobListings?.length ?? 0 },
    { label: "Applications submitted", value: applications?.length ?? 0 },
    { label: "Resumes uploaded", value: resumes?.length ?? 0 },
  ]

  const companyStats = [
    { label: "Active jobs", value: jobListings?.length ?? 0 },
    { label: "Applications received", value: applications?.length ?? 0 },
    { label: "Screens run", value: screens?.length ?? 0 },
  ]

  const stats =
    user?.role === "COMPANY"
      ? companyStats
      : applicantStats

  return (
    <Stack gap={6}>
      <Box>
        <Heading size="md">
          Hello, {user?.full_name || user?.email || "there"}
        </Heading>
        <Text>Here&apos;s a quick view of your activity.</Text>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {stats.map((item) => (
          <Box key={item.label} borderWidth="1px" borderRadius="md" p={4}>
            <Text fontWeight="semibold">{item.label}</Text>
            <Heading size="lg">{item.value}</Heading>
          </Box>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
