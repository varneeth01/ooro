const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");

if (!configuredApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL must be configured for the frontend build and runtime.");
}

export const apiUrl = configuredApiUrl;
