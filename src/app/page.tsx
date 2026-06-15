"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/components/VaultProvider";
import { hasPinSetup } from "@/lib/pin";

export default function Home() {
  const router = useRouter();
  const { isUnlocked } = useVault();

  useEffect(() => {
    if (isUnlocked) router.replace("/dashboard");
    else router.replace(hasPinSetup() ? "/pin" : "/unlock");
  }, [isUnlocked, router]);

  return null;
}
