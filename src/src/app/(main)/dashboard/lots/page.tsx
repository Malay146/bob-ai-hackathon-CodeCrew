import Link from "next/link";

import type { LotOutcome } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 50;

function isOutcome(value: string | undefined): value is LotOutcome {
  return value === "PASS" || value === "FAIL";
}

export default async function Page({ searchParams }: { searchParams: Promise<{ outcome?: string; page?: string }> }) {
  const params = await searchParams;
  const outcomeFilter = isOutcome(params.outcome) ? params.outcome : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const where = { role: "HISTORICAL" as const, ...(outcomeFilter ? { outcome: outcomeFilter } : {}) };

  const [lots, total] = await Promise.all([
    prisma.waferLot.findMany({
      where,
      orderBy: { lotNumber: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.waferLot.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Wafer lots</CardTitle>
          <CardDescription>{total} historical lots in the knowledge base</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button asChild variant={outcomeFilter === undefined ? "default" : "outline"} size="sm">
            <Link href="/dashboard/lots">All</Link>
          </Button>
          <Button asChild variant={outcomeFilter === "FAIL" ? "default" : "outline"} size="sm">
            <Link href="/dashboard/lots?outcome=FAIL">Failed</Link>
          </Button>
          <Button asChild variant={outcomeFilter === "PASS" ? "default" : "outline"} size="sm">
            <Link href="/dashboard/lots?outcome=PASS">Passed</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot</TableHead>
              <TableHead>Captured</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lots.map((lot) => (
              <TableRow key={lot.id}>
                <TableCell className="font-medium">#{lot.lotNumber}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(lot.capturedAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={lot.outcome === "PASS" ? "default" : "destructive"}>{lot.outcome}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/dashboard/lots/${lot.lotNumber}`} className="text-primary hover:underline">
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between text-muted-foreground text-sm">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={`/dashboard/lots?page=${page - 1}${outcomeFilter ? `&outcome=${outcomeFilter}` : ""}`}>
                Previous
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={`/dashboard/lots?page=${page + 1}${outcomeFilter ? `&outcome=${outcomeFilter}` : ""}`}>
                Next
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
