import { ViewTransition } from "react";
import { MotionScope } from "@/components/motion/motion-scope";

/**
 * Templates re-mount on every navigation. The ViewTransition gives each route change a short,
 * clean cut (old page steps back, new page wipes up — CSS in globals.css); browsers without
 * the View Transitions API simply swap pages. MotionScope re-runs scroll motion per route.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <MotionScope>{children}</MotionScope>
    </ViewTransition>
  );
}
