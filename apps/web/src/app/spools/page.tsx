import { Layers } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { de } from "@/messages/de";

export default function Page() {
  return (
    <ComingSoon
      path="/spools"
      title={de.placeholder.spoolsTitle}
      body={de.placeholder.spoolsBody}
      icon={Layers}
    />
  );
}
