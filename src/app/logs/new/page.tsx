"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Stary adres – przekierowuje do wpisywania dnia. */
export default function NewLogRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/dzien${window.location.search}`);
  }, [router]);
  return null;
}
