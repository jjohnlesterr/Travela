import { Suspense } from "react";
import TopBar from "@/components/TopBar";
import ItineraryView from "./ItineraryView";

export const metadata = { title: "Your itinerary · Travela" };

export default function ItineraryPage() {
  return (
    <>
      <TopBar title="Your itinerary" />
      {/* ItineraryView reads ?save=1 (post-login auto-save), which needs a Suspense boundary. */}
      <Suspense>
        <ItineraryView />
      </Suspense>
    </>
  );
}
