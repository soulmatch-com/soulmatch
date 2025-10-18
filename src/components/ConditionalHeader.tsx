"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function ConditionalHeader() {
  const pathname = usePathname();

  // Don't show user header on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <Header />;
}
