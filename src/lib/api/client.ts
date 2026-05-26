import createClient from "openapi-fetch";
import type { paths } from "./schema.d.ts";

const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5135");

export const apiClient = createClient<paths>({ baseUrl: BASE_URL });

/** Attach bearer token to every request when present. */
apiClient.use({
  onRequest({ request }) {
    const token = localStorage.getItem("auth-token");
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
});
