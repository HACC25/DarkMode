import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/applications")({
  component: ApplicationsPage,
})

function ApplicationsPage() {
  return <Outlet />
}
