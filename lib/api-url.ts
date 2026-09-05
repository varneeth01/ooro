const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");

// Production runs the API through the same-origin Netlify function. A local
// override is useful when the standalone API is running on port 8080.
export const apiUrl = configuredApiUrl ?? "";
