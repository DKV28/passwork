"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/components/VaultProvider";

export default function Home() {
  const router = useRouter();
  const { isUnlocked } = useVault();

  useEffect(() => {
    router.replace(isUnlocked ? "/dashboard" : "/unlock");
  }, [isUnlocked, router]);

  return null;
}
