"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { signOut } from "@/lib/auth-client";
import { de } from "@/messages/de";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={de.nav.signOut}
      title={de.nav.signOut}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/");
          router.refresh();
        })
      }
      className="flex size-11 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <LogOut className="size-[18px]" aria-hidden="true" />
    </button>
  );
}
