import { Providers } from "@/components/Providers";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <Providers>{children}</Providers>;
}
