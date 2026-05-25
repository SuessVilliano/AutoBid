"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ChatAssistant } from "@/components/ChatAssistant";

const CHROMELESS = ["/", "/login"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const chromeless = CHROMELESS.includes(path);

  if (chromeless) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <ChatAssistant />
    </>
  );
}
