import Link from "next/link";

import type { WaferLot } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RecentLotsTable({ lots }: { lots: WaferLot[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent lots</CardTitle>
        <CardDescription>Most recently run historical lots</CardDescription>
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
      </CardContent>
    </Card>
  );
}
