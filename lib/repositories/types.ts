export type Brand = { id: string; name: string; website: string; industry: string; market: string; description?: string };
export type CampaignDraft = { id: string; name: string; brand: string; updatedAt: string; data: Record<string, unknown> };
export type Creative = { id: string; name: string; type: "Image" | "Video"; status: "Draft" | "Approved"; createdAt: string };
export type Quote = { id: string; brand: string; campaign: string; budget: string; locations: string; requirements: string; status: "Draft" | "Requested" };
export type Audience = { id: string; name: string; description: string; locations: string };
