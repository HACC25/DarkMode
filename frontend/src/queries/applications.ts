import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult,
} from "@tanstack/react-query"

import {
  type ApplicationsGetApplicationEndpointData,
  type JobApplicationCreate,
  type JobApplicationRead,
  type JobApplicationStatusEnum,
  ApplicationsService,
  OpenAPI,
} from "@/client"
import { request as httpRequest } from "@/client/core/request"

export const applicationsKeys = {
  all: ["applications"] as const,
  list: () => [...applicationsKeys.all, "list"] as const,
  detail: (id: string) => [...applicationsKeys.all, "detail", id] as const,
}

export function useApplicationsQuery(): UseQueryResult<
  JobApplicationRead[]
> {
  return useQuery({
    queryKey: applicationsKeys.list(),
    queryFn: () => ApplicationsService.listApplicationsEndpoint(),
  })
}

export function useApplicationQuery(
  params: ApplicationsGetApplicationEndpointData,
): UseQueryResult<JobApplicationRead> {
  return useQuery({
    queryKey: applicationsKeys.detail(params.applicationId),
    queryFn: () => ApplicationsService.getApplicationEndpoint(params),
    enabled: Boolean(params.applicationId),
  })
}

export function useSubmitApplicationMutation(
  options: UseMutationOptions<JobApplicationRead, Error, JobApplicationCreate> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      ApplicationsService.submitApplicationEndpoint({
        requestBody: payload,
      }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}

type ApplicationStatusMutationVariables = {
  applicationId: string
  status: JobApplicationStatusEnum
}

function updateApplicationStatusRequest(variables: ApplicationStatusMutationVariables) {
  return httpRequest<JobApplicationRead>(OpenAPI, {
    method: "PUT",
    url: "/api/v1/applications/{application_id}/status",
    path: { application_id: variables.applicationId },
    body: { status: variables.status },
    mediaType: "application/json",
    errors: { 422: "Validation Error" },
  })
}

export function useUpdateApplicationStatusMutation(
  options: UseMutationOptions<JobApplicationRead, Error, ApplicationStatusMutationVariables> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateApplicationStatusRequest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}
