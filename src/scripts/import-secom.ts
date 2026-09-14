// Seeds the database from the raw UCI SECOM dataset files in data-raw/.
// Run with: npm run import:secom  (requires DATABASE_URL to already point
// at a reachable, migrated Postgres database — run `npm run db:push` first)
//
// The actual parsing/loading logic lives in src/lib/secom/import.ts, shared
// with the "Import dataset" page in the dashboard (app/api/import/route.ts)
// so both paths behave identically.

import { prisma } from "@/lib/db";
import { importSecomDataset } from "@/lib/secom/import";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data-raw");

async function main() {
  console.log("Reading SECOM data files...");
  const featureText = readFileSync(join(DATA_DIR, "secom.data"), "utf-8");
  const labelText = readFileSync(join(DATA_DIR, "secom_labels.data"), "utf-8");

  console.log("Importing and analysing...");
  const summary = await importSecomDataset(featureText, labelText);

  console.log(`Inserted ${summary.historicalCount} historical lots, ${summary.upcomingCount} upcoming batches.`);
  console.log(
    summary.topSuspectSensor
      ? `Top suspect sensor: ${summary.topSuspectSensor.sensorKey} (correlation ${summary.topSuspectSensor.correlation.toFixed(3)})`
      : "No suspect sensors found.",
  );
  console.log(`Scored ${summary.scoredBatches} upcoming batches.`);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
