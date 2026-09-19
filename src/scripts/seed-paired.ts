// Seeds SIMULATED paired sensor/defect-pattern wafers and checks the analysis
// recovers the planted links. Run with: npm run seed:paired
// (requires the SECOM lots to be seeded first — npm run import:secom)
//
// Real paired data would come from the dashboard's CSV import instead.

import { prisma } from "@/lib/db";
import { computePatternSensorLinks } from "@/lib/pairing/correlate";
import { seedSimulatedPairs } from "@/lib/pairing/simulate";

async function main() {
  console.log("Generating simulated paired wafers...");
  const { summary, planted } = await seedSimulatedPairs();
  console.log(`Seeded ${summary.totalWafers} wafers x ${summary.sensorCount} sensors (simulated).`);

  const analysis = await computePatternSensorLinks();
  console.log(`Bonferroni threshold: p < ${analysis.bonferroniThreshold.toExponential(2)}\n`);

  let recovered = 0;
  for (const p of analysis.patterns) {
    const plantedKeys = new Set(planted.filter((x) => x.pattern === p.pattern).map((x) => x.sensorKey));
    const significantKeys = p.links.filter((l) => l.significant).map((l) => l.sensorKey);
    const hits = significantKeys.filter((k) => plantedKeys.has(k)).length;
    recovered += hits;
    console.log(
      `${p.pattern.padEnd(10)} n=${String(p.waferCount).padEnd(4)} planted=[${[...plantedKeys].join(", ")}] ` +
        `top=[${p.links.map((l) => `${l.sensorKey}${l.significant ? "*" : ""}(${l.correlation.toFixed(2)})`).join(", ")}]`,
    );
  }
  console.log(`\nRecovered ${recovered}/${planted.length} planted links as significant (* = significant).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
