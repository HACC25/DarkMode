import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult,
} from "@tanstack/react-query"

import {
  type Body_jobs_parse_job_listing_file,
  type JobListingCreate,
  type JobListingParseRequest,
  type JobListingParseResponse,
  type JobListingRead,
  JobsService,
} from "@/client"

export const jobsKeys = {
  all: ["jobs"] as const,
  listings: () => [...jobsKeys.all, "list"] as const,
  parsed: () => [...jobsKeys.all, "parsed"] as const,
}

export function useJobListingsQuery(): UseQueryResult<JobListingRead[]> {
  return useQuery({
    queryKey: jobsKeys.listings(),
    queryFn: () => JobsService.listJobListings(),
  })
}

export function useCreateJobListingMutation(
  options: UseMutationOptions<JobListingRead, Error, JobListingCreate> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      JobsService.createJobListing({ requestBody: payload }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.listings() })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}

export function useParseJobListingMutation(
  options: UseMutationOptions<JobListingParseResponse, Error, JobListingParseRequest> = {},
) {
  return useMutation({
    mutationFn: (payload) =>
      JobsService.parseJobListing({ requestBody: payload }),
    ...options,
  })
}

export function useParseJobListingFileMutation(
  options: UseMutationOptions<
    JobListingParseResponse,
    Error,
    Body_jobs_parse_job_listing_file
  > = {},
) {
  return useMutation({
    mutationFn: (formData) =>
      JobsService.parseJobListingFile({ formData }),
    ...options,
  })
}
