"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** No content of its own - the Admin App's real home is the menu editor. */
export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/menu");
  }, [router]);

  return null;
}
