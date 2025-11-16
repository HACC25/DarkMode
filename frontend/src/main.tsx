import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import React, { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { routeTree } from "./routeTree.gen"

import { ApiError, OpenAPI } from "./client"
import { CustomProvider } from "./components/ui/provider"

const envApiUrl = import.meta.env.VITE_API_URL
const isBrowser = typeof window !== "undefined"
const isLocalHostname = (hostname: string) =>
  ["localhost", "127.0.0.1", "::1"].includes(hostname.toLowerCase())

const fallbackApiUrl = (() => {
  if (!isBrowser) {
    return envApiUrl
  }

  if (isLocalHostname(window.location.hostname)) {
    return "http://localhost:8000"
  }

  return `${window.location.protocol}//api.${window.location.hostname}`
})()

OpenAPI.BASE = envApiUrl || fallbackApiUrl
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

const handleApiError = (error: Error) => {
  if (error instanceof ApiError && error.status === 401) {
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CustomProvider>
  </StrictMode>,
)
