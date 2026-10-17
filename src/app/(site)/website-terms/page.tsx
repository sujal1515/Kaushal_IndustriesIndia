import { cmsMetadata } from "@/lib/cms/content";
import { CmsLegalPage } from "@/components/site/legal-page";

export const generateMetadata = () => cmsMetadata("website-terms", "/website-terms");

export default function Page() {
  return <CmsLegalPage pageKey="website-terms" path="/website-terms" />;
}
