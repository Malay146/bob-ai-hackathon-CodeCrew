import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { DefectClassifierLazy } from "./_components/defect-classifier-lazy";

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Defect Pattern Analyser</CardTitle>
        <CardDescription>
          Classifies a wafer defect map into one of 8 known failure patterns (Center, Donut,
          Edge-Loc, Edge-Ring, Loc, Near-full, Random, Scratch) using a custom CNN trained from
          scratch on the WM-811K dataset — not a transfer-learning model, because wafer maps are
          categorical die-state grids, not photographic images. Returns a ranked cause and
          corrective action for each prediction. Inference runs entirely in the browser via
          TensorFlow.js with no server round-trip, complementing the sensor-based root cause
          engine on the other dashboard pages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DefectClassifierLazy />
      </CardContent>
    </Card>
  );
}
