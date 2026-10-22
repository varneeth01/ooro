/** Compatibility handler for legacy payment paths. Online processing is retired. */
export async function handler() { return { statusCode: 410, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify({ data: null, error: { code: "PAYMENT_PROCESSING_RETIRED", message: "Online payment processing is no longer available." } }) }; }

