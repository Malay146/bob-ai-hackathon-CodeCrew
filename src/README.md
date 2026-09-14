# WaferLens — Source

Next.js 16 app (App Router) + Prisma/Postgres, built on the
[next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)
starter (shadcn/ui components throughout).

## Layout

```
src/                      ← Next.js project root (this directory)
  data-raw/               ← Raw UCI SECOM dataset (committed, see its README)
  prisma/
    schema.prisma         ← WaferLot / SuspectSensor / RootCauseFinding models
  scripts/
    import-secom.ts       ← Parses data-raw/*.data, seeds Postgres, runs first analysis
  src/                    ← Next.js "src directory" (app/components/lib/...)
    app/
      (main)/dashboard/   ← Overview, Wafer Lots, Risk Watch, Ask Bob pages
      api/assistant/      ← Chat endpoint backing the "Ask Bob" page
    lib/
      analysis/           ← Plain-statistics engine: correlation, root-cause
                             ranking, risk scoring, trend (no ML libraries)
      assistant.ts         ← Shared reasoning used by both the dashboard chat
                             and the MCP tools below
      watsonx.ts            ← Optional IBM watsonx.ai narration (falls back
                             to templated text if unset)
      secom/parse.ts        ← SECOM raw-format parser
    mcp/
      server.ts             ← MCP server exposing the same analysis as tools
                             for the IBM Bob agent (npm run mcp)
    components/ui/          ← shadcn/ui components
```

See [`docs/setup-guide.md`](../docs/setup-guide.md) at the repo root for exact
install/run/import commands.
