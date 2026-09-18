const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");

// Production can point the web app at the separately deployed API. A local
// override is useful when the standalone API is running on port 8080.
export const apiUrl = configuredApiUrl ?? "";
