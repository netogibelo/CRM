import { Providers } from "@/components/Providers";
import { NavProvider } from "@/lib/nav-store";
import { RailShell } from "@/components/rail/RailShell";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Providers>
      <NavProvider>
        <RailShell>{children}</RailShell>
      </NavProvider>
    </Providers>
  );
}
