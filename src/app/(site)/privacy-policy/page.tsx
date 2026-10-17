import { cmsMetadata } from "@/lib/cms/content";
import { CmsLegalPage } from "@/components/site/legal-page";

export const generateMetadata = () => cmsMetadata("privacy-policy", "/privacy-policy");

export default function Page() {
  return <CmsLegalPage pageKey="privacy-policy" path="/privacy-policy" />;
}
