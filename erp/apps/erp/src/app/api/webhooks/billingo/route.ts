import { NextResponse } from "next/server";
import {
  bizonylatApi,
  feldolgozBillingoWebhook,
  BILLINGO_ALAIRAS_FEJLEC,
} from "@erp/bizonylat";

export const dynamic = "force-dynamic";

/**
 * Billingo webhook. The raw body is verified (HMAC-SHA256, constant time) before anything is
 * parsed; the secret comes from `BILLINGO_WEBHOOK_SECRET` (never hard-coded). All logic lives in
 * the package's pure `feldolgozBillingoWebhook`.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const valasz = await feldolgozBillingoWebhook(
    rawBody,
    req.headers.get(BILLINGO_ALAIRAS_FEJLEC),
    process.env.BILLINGO_WEBHOOK_SECRET,
    (esemeny) => bizonylatApi.billingoKifizetve(esemeny),
  );
  return NextResponse.json(valasz.body, { status: valasz.status });
}
