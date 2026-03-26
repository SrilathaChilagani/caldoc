"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  id: string;
  name: string;
  speciality: string;
  lat: number;
  lng: number;
  clinicName: string;
  address: string;
  slug: string;
};

type Props = {
  pins: MapPin[];
  activeId?: string | null;
  onPinClick?: (id: string) => void;
  city?: string;
};

// Hyderabad default
const DEFAULT_CENTER: [number, number] = [17.385, 78.4867];
const DEFAULT_ZOOM = 11;

// City center coordinates
const CITY_CENTERS: Record<string, [number, number]> = {
  hyderabad: [17.385, 78.4867],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
  ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873],
  surat: [21.1702, 72.8311],
  lucknow: [26.8467, 80.9462],
};

function getCityCenter(city: string): [number, number] {
  const key = city.trim().toLowerCase();
  return CITY_CENTERS[key] ?? DEFAULT_CENTER;
}

export default function MapView({ pins, activeId, onPinClick, city }: Props) {
  const mapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, ReturnType<typeof import("leaflet")["marker"]>>>(new Map());

  useEffect(() => {
    // Dynamically import leaflet (avoids SSR issues)
    let L: typeof import("leaflet");
    let mounted = true;

    import("leaflet").then((mod) => {
      if (!mounted || !containerRef.current) return;
      L = mod.default ?? mod;

      // Fix default icon paths for Next.js/webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Avoid double-init (React StrictMode)
      if (mapRef.current) return;

      const center = city ? getCityCenter(city) : DEFAULT_CENTER;
      const map = L.map(containerRef.current).setView(center, DEFAULT_ZOOM);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Add pins
      for (const pin of pins) {
        const marker = L.marker([pin.lat, pin.lng])
          .addTo(map)
          .bindPopup(
            `<div style="min-width:180px">
              <p style="font-weight:600;font-size:14px;margin:0">${pin.name}</p>
              <p style="font-size:12px;color:#2f6ea5;margin:2px 0">${pin.speciality}</p>
              <p style="font-size:11px;color:#666;margin:2px 0">${pin.clinicName}</p>
              <p style="font-size:11px;color:#888;margin:0">${pin.address}</p>
              <a href="/book/${encodeURIComponent(pin.slug)}" style="display:inline-block;margin-top:6px;padding:4px 12px;background:#2f6ea5;color:#fff;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none">Book</a>
            </div>`
          );
        marker.on("click", () => onPinClick?.(pin.id));
        markersRef.current.set(pin.id, marker);
      }

      // If no pins with coords, just show the city center
      if (pins.length > 0) {
        const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open popup when activeId changes
  useEffect(() => {
    if (!activeId || !mapRef.current) return;
    const marker = markersRef.current.get(activeId);
    if (marker) {
      marker.openPopup();
      mapRef.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [activeId]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
