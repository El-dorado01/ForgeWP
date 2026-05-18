import { getDocs } from "@/lib/docs";
import { DocPortal } from "@/components/DocPortal";

export default function Page() {
  const docs = getDocs();
  return <DocPortal docs={docs} />;
}
