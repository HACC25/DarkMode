import {
  Box,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"
import { useScreensQuery } from "@/queries/screens"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/screens")({
  component: ScreensPage,
})

function ScreensPage() {
  const { user } = useAuth()
  const { showErrorToast } = useCustomToast()
  const { data: screens, isLoading } = useScreensQuery({
    enabled: user?.role === "COMPANY",
    onError: () => {
      showErrorToast("Could not load screening results.")
    },
  })

  if (user?.role !== "COMPANY") {
    return (
      <Stack gap={4}>
        <Heading size="lg">Screens</Heading>
        <Text>This section is only available to company users.</Text>
      </Stack>
    )
  }

  return (
    <Stack gap={6}>
      <Heading size="lg">Screens</Heading>
      {isLoading && <Text>Loading screens...</Text>}
      {!isLoading && (screens ?? []).length === 0 && (
        <Text>No screening results yet.</Text>
      )}
      {(screens ?? []).map((screen) => (
        <Box key={screen.application_id} borderWidth="1px" borderRadius="md" p={4}>
          <Stack gap={3}>
            <Text fontWeight="semibold">
              Application ID: {screen.application_id}
            </Text>
            <Box>
              <Heading size="sm">Minimum qualifications</Heading>
              <Stack mt={2} gap={1}>
                {(screen.minimum_qualifications ?? []).map((item, index) => (
                  <Text key={index}>
                    {item.status}: {item.reason}
                  </Text>
                ))}
                {(screen.minimum_qualifications ?? []).length === 0 && (
                  <Text>No minimum qualifications recorded.</Text>
                )}
              </Stack>
            </Box>
            <Box>
              <Heading size="sm">Preferred qualifications</Heading>
              <Stack mt={2} gap={1}>
                {(screen.preferred_qualifications ?? []).map((item, index) => (
                  <Text key={index}>
                    {item.status}: {item.reason}
                  </Text>
                ))}
                {(screen.preferred_qualifications ?? []).length === 0 && (
                  <Text>No preferred qualifications recorded.</Text>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}
