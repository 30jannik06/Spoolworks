"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { de } from "@/messages/de";

export function PrintButton() {
  return (
    <Button type="button" className="h-11 px-5" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      {de.labels.print}
    </Button>
  );
}
