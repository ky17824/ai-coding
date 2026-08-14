import * as React from "react";

export default function Loading() {
  return (
    <main className="route-loading" role="status" aria-live="polite" aria-label="Loading">
      <span className="route-loading__spinner" aria-hidden="true" />
    </main>
  );
}
