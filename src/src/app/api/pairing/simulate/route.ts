import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { seedSimulatedPairs } from "@/lib/pairing/simulate";

/** (Re)generates the simulated paired dataset. Refuses to overwrite real imported data. */
export async function POST() {
  const realCount = await prisma.pairedWafer.count({ where: { simulated: false } });
  if (realCount > 0) {
    return NextResponse.json(
      { error: "Real paired data is loaded — importing a new CSV replaces it; simulating would overwrite it." },
      { status: 409 },
    );
  }

  try {
    const { summary } = await seedSimulatedPairs();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Simulation failed." }, { status: 400 });
  }
}
