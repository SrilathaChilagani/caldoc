// src/app/room/[id]/room-client.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

type Props = {
  appointmentId: string;
  role?: "patient" | "provider" | "guest";
  displayName?: string;
  fromParam?: string | null;
};

export default function RoomClient({
  appointmentId,
  role = "guest",
  displayName = "Guest",
  fromParam = null,
}: Props) {
  /**
   * Video provider mode:
   * - Default from env (NEXT_PUBLIC_VIDEO_PROVIDER)
   * - “daily” (uses Daily Prebuilt, needs DOMAIN + API KEY)
   * - “jitsi” (free fallback, no account/billing required)
   */
  const envMode = (process.env.NEXT_PUBLIC_VIDEO_PROVIDER || "daily").toLowerCase();
  const mode = (envMode === "jitsi" ? "jitsi" : "daily") as "daily" | "jitsi";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const callRef = useRef<DailyCall | null>(null);

  const [url, setUrl] = useState<string>("");       // Daily join URL (unused for Jitsi)
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  /* ----------------------------------------------------------------------
   * 1) DAILY ONLY — ensure room & fetch join URL (idempotent on the server)
   * -------------------------------------------------------------------- */
  useEffect(() => {
    if (mode !== "daily") return;

    let cancelled = false;

    (async () => {
      try {
        setErr(null);
        const res = await fetch(`/api/video/ensure-room?provider=${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to ensure room");
        }
        if (!cancelled) {
          setUrl(String(data.url));
        }
      } catch (err) {
        console.error("ensure-room failed:", err);
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to prepare room";
          setErr(message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, mode]);

  /* ----------------------------------------------------------------------
   * 2) DAILY ONLY — mount Prebuilt & join with a display name
   *    (safe against loops; we only create the frame for a valid Daily URL)
   * -------------------------------------------------------------------- */
  useEffect(() => {
    if (mode !== "daily") return;
    if (!url || !containerRef.current) return;

    // Clean previous frame if present
    if (callRef.current) {
      try {
        callRef.current.leave();
        callRef.current.destroy();
      } catch {}
      callRef.current = null;
    }

    const frame = DailyIframe.createFrame(containerRef.current, {
      showLeaveButton: true,
      iframeStyle: {
        width: "100%",
        height: "72vh",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        backgroundColor: "black",
      },
    });

    callRef.current = frame;
    setJoining(true);
    setErr(null);

    frame
      .join({
        url,
        userName:
          role === "provider"
            ? `${displayName} (Provider)`
            : role === "patient"
            ? `${displayName} (Patient)`
            : displayName,
      })
      .then(() => setJoining(false))
      .catch((err) => {
        console.error("Daily join failed:", err);
        setJoining(false);
        const message =
          err instanceof Error
            ? err.message
            : typeof (err as { error?: unknown })?.error === "string"
            ? (err as { error?: string }).error
            : "Join failed";
        setErr(message ?? "Join failed");
      });

    // Cleanup on unmount
    const beforeUnload = () => {
      try {
        frame.leave();
        frame.destroy();
      } catch {}
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      try {
        frame.leave();
        frame.destroy();
      } catch {}
      callRef.current = null;
    };
  }, [url, role, displayName, mode]);

  /* -----------------------------------
   * 3) End visit → leave & back to visit
   * --------------------------------- */
  function handleEndVisit() {
    if (mode === "daily") {
      try {
        callRef.current?.leave();
        callRef.current?.destroy();
      } catch {}
      callRef.current = null;
    }
    const nextPath = fromParam ? `/visit/${appointmentId}?from=${fromParam}` : `/visit/${appointmentId}`;
    router.replace(nextPath);
  }

  /* -----------------------------------
   * Jitsi embed URL (no billing needed)
   * --------------------------------- */
  const jitsiRoom = `telemed-${appointmentId}`;
  const jitsiSrc =
    `https://meet.jit.si/${encodeURIComponent(jitsiRoom)}` +
    `#userInfo.displayName=${encodeURIComponent(
      role === "provider"
        ? `${displayName} (Provider)`
        : role === "patient"
        ? `${displayName} (Patient)`
        : displayName
    )}`;

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold">CalDoc Room</h1>
          <p className="text-sm text-gray-500">
            Appointment <span className="font-mono">{appointmentId}</span>{" "}
            ·{" "}
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {role === "provider" ? "Provider" : role === "patient" ? "Patient" : "Guest"}
            </span>{" "}
            · <span className="uppercase">{mode}</span>
          </p>
        </div>

        <button
          onClick={handleEndVisit}
          className="rounded-lg bg-rose-600 px-4 py-2 text-white font-medium hover:bg-rose-700 transition"
        >
          End Visit
        </button>
      </div>

      {/* Status banners (Daily only for joining; errors for both) */}
      {mode === "daily" && joining && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
          Joining the room…
        </div>
      )}
      {err && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          {err}
        </div>
      )}

      {/* Video surface */}
      {mode === "daily" ? (
        <div ref={containerRef} />
      ) : (
        <iframe
          title="CalDoc Jitsi Room"
          src={jitsiSrc}
          allow="camera; microphone; fullscreen; display-capture; clipboard-write"
          style={{
            width: "100%",
            height: "72vh",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            backgroundColor: "black",
          }}
        />
      )}

      <div className="mt-3 text-xs text-gray-500">
        Tip: open this room in a second browser/device to test multi-party and see the name labels.
      </div>
    </main>
  );
}
