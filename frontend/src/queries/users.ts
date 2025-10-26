import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult,
} from "@tanstack/react-query"

import {
  type UserCreate,
  type UserPublic,
  type UserUpdate,
  type UsersReadUsersData,
  UsersService,
} from "@/client"

export const usersKeys = {
  all: ["users"] as const,
  list: (params: UsersReadUsersData = {}) =>
    [...usersKeys.all, { params }] as const,
  detail: (id: string) => [...usersKeys.all, "detail", id] as const,
  me: () => [...usersKeys.all, "me"] as const,
}

export function useUsersQuery(
  params: UsersReadUsersData = {},
): UseQueryResult<{ users: UserPublic[]; total: number }> {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: async () => {
      const response = await UsersService.readUsers(params)
      return {
        users: response.data,
        total: response.count,
      }
    },
  })
}

export function useCurrentUserQuery(): UseQueryResult<UserPublic> {
  return useQuery({
    queryKey: usersKeys.me(),
    queryFn: () => UsersService.readUserMe(),
  })
}

export function useCreateUserMutation(
  options: UseMutationOptions<UserPublic, Error, UserCreate> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UserCreate) =>
      UsersService.createUser({ requestBody: payload }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}

export function useUpdateUserMutation(
  options: UseMutationOptions<UserPublic, Error, { id: string; data: UserUpdate }> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) =>
      UsersService.updateUser({ userId: id, requestBody: data }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}

export function useDeleteUserMutation(
  options: UseMutationOptions<void, Error, string> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      await UsersService.deleteUser({ userId: id })
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}
