import type { Metadata } from "next";
import { SiteChrome } from "@/components/site/site-chrome";
import { NotFoundContent } from "@/components/site/not-found-content";
import { MotionScope } from "@/components/motion/motion-scope";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SiteChrome>
      <MotionScope>
        <NotFoundContent />
      </MotionScope>
    </SiteChrome>
  );
}
