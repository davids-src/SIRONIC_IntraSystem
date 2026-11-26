import { NextResponse } from "next/server";
import { getSession } from "@/lib/session-cookie";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session });
}
