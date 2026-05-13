import { makeQueryClient, setApiBaseUrl } from "@showtracker/api-client"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { API_URL } from "./config"

setApiBaseUrl(API_URL)

export const queryClient = makeQueryClient()

const persister = createAsyncStoragePersister({ storage: AsyncStorage })

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
})
