import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult,
} from "@tanstack/react-query"

import {
  type JobApplicationScreenCreate,
  type JobApplicationScreenRead,
  type ScreensGetScreenEndpointData,
  type ScreensUpsertApplicationScreenEndpointData,
  ScreensService,
} from "@/client"
import { applicationsKeys } from "./applications"

export const screensKeys = {
  all: ["screens"] as const,
  list: () => [...screensKeys.all, "list"] as const,
  detail: (id: string) => [...screensKeys.all, "detail", id] as const,
}

export function useScreensQuery(
  options: { enabled?: boolean; onError?: (error: Error) => void } = {},
): UseQueryResult<JobApplicationScreenRead[]> {
  return useQuery({
    queryKey: screensKeys.list(),
    queryFn: () => ScreensService.listScreensEndpoint(),
    ...options,
  })
}

export function useScreenQuery(
  params: ScreensGetScreenEndpointData,
): UseQueryResult<JobApplicationScreenRead> {
  return useQuery({
    queryKey: screensKeys.detail(params.screenId),
    queryFn: () => ScreensService.getScreenEndpoint(params),
    enabled: Boolean(params.screenId),
  })
}

export function useCreateScreenMutation(
  options: UseMutationOptions<
    JobApplicationScreenRead,
    Error,
    JobApplicationScreenCreate
  > = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      ScreensService.createScreenEndpoint({ requestBody: payload }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: screensKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}

export function useUpdateScreenMutation(
  options: UseMutationOptions<
    JobApplicationScreenRead,
    Error,
    ScreensUpsertApplicationScreenEndpointData
  > = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      ScreensService.upsertApplicationScreenEndpoint(payload),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: screensKeys.all })
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}
