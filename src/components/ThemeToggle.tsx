"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="px-3 py-1 rounded border text-sm hover:bg-gray-700 bg-gray-900 text-white"
    >
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
