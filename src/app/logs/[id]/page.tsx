"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { getWorkLog } from "@/lib/services/logs";

/** Stary adres pojedynczego wpisu – otwiera cały dzień, w którym jest ten wpis. */
export default function LogRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    getWorkLog(params.id)
      .then((log) => (log ? router.replace(`/dzien?data=${log.dateKey}`) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [params.id, router]);

  return <AppShell>{missing ? <EmptyState title="Nie znaleziono wpisu" body="Mógł zostać usunięty." /> : <SkeletonList />}</AppShell>;
}
