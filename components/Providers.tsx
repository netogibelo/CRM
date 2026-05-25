"use client";

import { CrmProvider } from "@/lib/crm-store";
import { ActivitiesProvider } from "@/lib/activities-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CrmProvider>
      <ActivitiesProvider>{children}</ActivitiesProvider>
    </CrmProvider>
  );
}
