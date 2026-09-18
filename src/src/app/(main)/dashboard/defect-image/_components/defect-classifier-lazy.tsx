"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// TF.js uses browser-only APIs (canvas, WebGL) — must be client-side only.
export const DefectClassifierLazy = dynamic(
  () => import("./defect-classifier").then((m) => m.DefectClassifier),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="size-4 animate-spin" />
        Loading classifier…
      </div>
    ),
  },
);
