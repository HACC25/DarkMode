import { Box, Flex, HStack, chakra } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"

import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import UserMenu from "./UserMenu"

const RouterLink = chakra(Link)

function Navbar() {
  const { user } = useAuth()
  const authenticated = isLoggedIn()
  const navLinks = [
    { label: "Dashboard", to: "/" },
    { label: "Jobs", to: "/jobs" },
    { label: "Applications", to: "/applications" },
  ]

  if (user?.role === "APPLICANT") {
    navLinks.push({ label: "Resumes", to: "/resumes" })
  }

  // if (user?.role === "COMPANY") {
  //   navLinks.push({ label: "Screens", to: "/screens" })
  // }

  return (
    <Box borderBottomWidth="1px" borderBottomColor="ui.main">
      <Flex
        align="center"
        bg="ui.main"
        color="white"
        justify="space-between"
        px={4}
        py={3}
      >
        <HStack gap={4}>
          <RouterLink
            to="/"
            fontWeight="bold"
            fontSize="xl"
            textDecoration="none"
            _hover={{ color: "whiteAlpha.800" }}
          >
            AppScreen
          </RouterLink>
          {authenticated && (
            <HStack gap={3}>
              {navLinks.map((link) => (
                <RouterLink
                  key={link.to}
                  to={link.to}
                  fontWeight="medium"
                  fontSize="lg"
                  textDecoration="none"
                  _hover={{ color: "whiteAlpha.800" }}
                >
                  {link.label}
                </RouterLink>
              ))}
            </HStack>
          )}
        </HStack>
        <UserMenu />
      </Flex>
    </Box>
  )
}

export default Navbar
