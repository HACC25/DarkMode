import { Box, Flex, HStack, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"

import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import UserMenu from "./UserMenu"

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
    <Box borderBottomWidth="1px">
      <Flex align="center" justify="space-between" px={4} py={3}>
        <HStack gap={4}>
          <Link to="/">
            <Text fontWeight="bold">AppScreen</Text>
          </Link>
          {authenticated && (
            <HStack gap={3}>
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
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
