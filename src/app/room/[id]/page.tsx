// src/app/room/[id]/page.tsx
import RoomClient from "./room-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [k: string]: string | string[] | undefined }>;
};

export default async function RoomPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  // Allow passing role & display name via query params for labeling
  const allowedRoles = new Set(["provider", "patient", "guest"]);
  const roleParam = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  const role =
    roleParam && allowedRoles.has(roleParam) ? (roleParam as "provider" | "patient" | "guest") : "guest";
  const displayName =
    (Array.isArray(sp.name) ? sp.name[0] : sp.name) ||
    (role === "provider" ? "Doctor" : "Patient");

  return <RoomClient appointmentId={id} role={role} displayName={displayName} />;
}



// ** this is just a placeholder
/*
type Props = {
  params: Promise<{ id: string }>;
};

export default async function RoomPage({ params }: Props) {
  const { id } = await params;

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center space-y-6">
      <h1 className="text-2xl font-semibold">Room Placeholder</h1>
      <p className="text-gray-700">Room for appointment <span className="font-mono">{id}</span></p>
      <p className="text-gray-500">
        On Day 5 we'll embed a real video provider here (Daily/LiveKit/Twilio).
      </p>
    </main>
  );
}
*/
//
