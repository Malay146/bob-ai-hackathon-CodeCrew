import Link from "next/link";

import { Bot } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SupportCard() {
  return (
    <Card size="sm" className="overflow-hidden shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader className="min-w-0 px-4">
        <CardTitle className="flex items-center gap-1.5 truncate text-sm">
          <Bot className="size-4" />
          Ask Bob
        </CardTitle>
        <CardDescription className="line-clamp-3">
          Chat with the Bob agent about any lot&apos;s root causes and recommended actions.{" "}
          <Link href="/dashboard/assistant" className="text-foreground hover:underline">
            Open assistant
          </Link>
          .
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
