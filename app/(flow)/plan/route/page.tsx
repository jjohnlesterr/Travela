import { Suspense } from "react";
import TopBar from "@/components/TopBar";
import RouteView from "./RouteView";

export const metadata = { title: "Green route · Travela" };

export default function RoutePage() {
  return (
    <>
      <TopBar title="Green route" />
      {/* RouteView reads ?save=1 (post-login auto-save), which needs a Suspense boundary. */}
      <Suspense>
        <RouteView />
      </Suspense>
    </>
  );
}
