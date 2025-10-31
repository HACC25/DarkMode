import { Box, Container } from "@chakra-ui/react"
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import Navbar from "@/components/Common/Navbar"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <Box minH="100vh">
      <Navbar />
      <Container maxW="6xl" py={8}>
        <Outlet />
      </Container>
    </Box>
  )
}

export default Layout
