"use client";

import ErrorScreen from "@/components/ErrorScreen";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorScreen {...props} />;
}
