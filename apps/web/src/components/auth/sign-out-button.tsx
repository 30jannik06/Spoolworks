"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { de } from "@/messages/de";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      className="h-11 px-4"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/");
          router.refresh();
        })
      }
    >
      {de.nav.signOut}
    </Button>
  );
}
