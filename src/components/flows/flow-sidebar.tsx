"use client";

import { Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function FlowSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 h-full bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-3">
      <Link
        href="/flows"
        title="Canvas"
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          pathname === "/flows" || pathname?.startsWith("/flows/")
            ? "bg-[#D4AF7F]/20 text-[#095D40]"
            : "hover:bg-gray-100 text-gray-700"
        }`}
      >
        <Workflow className="h-5 w-5" />
      </Link>
    </aside>
  );
}
