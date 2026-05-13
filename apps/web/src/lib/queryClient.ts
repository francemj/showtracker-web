import {
  makeQueryClient,
  setApiBaseUrl,
  setApiTokenGetter,
  apiRequest,
  getQueryFn,
} from "@showtracker/api-client"

export { setApiTokenGetter, apiRequest, getQueryFn, setApiBaseUrl }

// Web app uses relative URLs
setApiBaseUrl("")

export const queryClient = makeQueryClient()
