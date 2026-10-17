import { cmsMetadata } from "@/lib/cms/content";
import { CmsLegalPage } from "@/components/site/legal-page";

export const generateMetadata = () => cmsMetadata("disclaimer", "/disclaimer");

export default function Page() {
  return <CmsLegalPage pageKey="disclaimer" path="/disclaimer" />;
}
