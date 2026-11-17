import { Printer } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { de } from "@/messages/de";

export default function Page() {
  return (
    <ComingSoon
      path="/printers"
      title={de.placeholder.printersTitle}
      body={de.placeholder.printersBody}
      icon={Printer}
    />
  );
}
