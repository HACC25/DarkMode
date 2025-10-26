import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult,
} from "@tanstack/react-query"

import {
  type ItemCreate,
  type ItemPublic,
  type ItemsReadItemsData,
  ItemsService,
} from "@/client"

export const itemsKeys = {
  all: ["items"] as const,
  list: (params: ItemsReadItemsData = {}) =>
    [...itemsKeys.all, { params }] as const,
  detail: (id: string) => [...itemsKeys.all, "detail", id] as const,
}

export function useItemsQuery(
  params: ItemsReadItemsData = {},
): UseQueryResult<{ items: ItemPublic[]; total: number }> {
  return useQuery({
    queryKey: itemsKeys.list(params),
    queryFn: async () => {
      const response = await ItemsService.readItems(params)
      return {
        items: response.data,
        total: response.count,
      }
    },
  })
}

export function useCreateItemMutation(
  options: UseMutationOptions<ItemPublic, Error, ItemCreate> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ItemCreate) =>
      ItemsService.createItem({ requestBody: payload }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: itemsKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}

export function useDeleteItemMutation(
  options: UseMutationOptions<void, Error, string> = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await ItemsService.deleteItem({ id })
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: itemsKeys.all })
      options.onSuccess?.(...args)
    },
    ...options,
  })
}
