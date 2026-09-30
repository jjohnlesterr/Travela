"use client";

import ErrorScreen from "@/components/ErrorScreen";
import TopBar from "@/components/TopBar";

export default function FlowError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <TopBar />
      <ErrorScreen {...props} />
    </>
  );
}
