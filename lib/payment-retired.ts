import { NextResponse } from "next/server";
export const PAYMENT_RETIRED_CODE = "PAYMENT_PROCESSING_RETIRED";
export function paymentRetiredResponse() { return NextResponse.json({ data: null, error: { code: PAYMENT_RETIRED_CODE, message: "Online payment processing is no longer available. Contact OORO operations for campaign approval." } }, { status: 410, headers: { "cache-control": "no-store" } }); }

