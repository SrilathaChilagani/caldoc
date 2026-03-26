import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { PATIENT_COOKIE, signPatientSession } from "@/lib/patientAuth.server";

export const dynamic = "force-dynamic";

const MAX_AGE_DAYS = 365;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const jar = await cookies();

  if (errorParam) {
    return NextResponse.redirect(`${appUrl}/patient/signup?error=google_cancelled`);
  }

  // Verify CSRF state
  const savedState = jar.get("oauth_state")?.value;
  jar.delete("oauth_state");
  if (!state || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/patient/signup?error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/patient/signup?error=no_code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      return NextResponse.redirect(`${appUrl}/patient/signup?error=token_exchange_failed`);
    }

    // Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userRes.json();

    const email = profile.email as string | undefined;
    const name = (profile.name as string | undefined) || "";
    const googleId = profile.sub as string;

    if (!email) {
      return NextResponse.redirect(`${appUrl}/patient/signup?error=no_email`);
    }

    // Find or create patient
    let patient = await prisma.patient.findFirst({
      where: { OR: [{ email }, { phone: `google:${googleId}` }] },
      select: { id: true, phone: true },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name,
          email,
          phone: `google:${googleId}`,
          consentAt: new Date(),
        },
        select: { id: true, phone: true },
      });
    }

    // Set patient session cookie
    const token = signPatientSession(patient.phone, patient.id);
    jar.set(PATIENT_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.redirect(`${appUrl}/patient/appointments`);
  } catch (err) {
    console.error("[google/callback]", err);
    return NextResponse.redirect(`${appUrl}/patient/signup?error=server_error`);
  }
}
