import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Passwordless login has moved. Use the OTP endpoints instead.",
    },
    { status: 410 },
  );
}
