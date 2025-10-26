import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult,
} from "@tanstack/react-query"

import {
  type Body_resumes_upload_resume_endpoint,
  type ResumesGetResumeEndpointData,
  type ResumeRead,
  ResumesService,
} from "@/client"

export const resumesKeys = {
  all: ["resumes"] as const,
  list: () => [...resumesKeys.all, "list"] as const,
  detail: (id: string) => [...resumesKeys.all, "detail", id] as const,
}

export function useResumesQuery(): UseQueryResult<ResumeRead[]> {
  return useQuery({
    queryKey: resumesKeys.list(),
    queryFn: () => ResumesService.listResumesEndpoint(),
  })
}

export function useResumeQuery(
  params: ResumesGetResumeEndpointData,
): UseQueryResult<ResumeRead> {
  return useQuery({
    queryKey: resumesKeys.detail(params.resumeId),
    queryFn: () => ResumesService.getResumeEndpoint(params),
    enabled: Boolean(params.resumeId),
  })
}

export function useUploadResumeMutation(
  options: UseMutationOptions<
    ResumeRead,
    Error,
    Body_resumes_upload_resume_endpoint
  > = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData) =>
      ResumesService.uploadResumeEndpoint({ formData }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: resumesKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}

export function useDeleteResumeMutation(
  options: UseMutationOptions<void, Error, string> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await ResumesService.deleteResumeEndpoint({ resumeId: id })
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: resumesKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}
