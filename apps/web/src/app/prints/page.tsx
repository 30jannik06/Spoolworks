import { Images } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { de } from "@/messages/de";

export default function Page() {
  return (
    <ComingSoon
      path="/prints"
      title={de.placeholder.printsTitle}
      body={de.placeholder.printsBody}
      icon={Images}
    />
  );
}
