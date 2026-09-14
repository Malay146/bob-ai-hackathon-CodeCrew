import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { AssistantChat } from "./_components/assistant-chat";

export default function Page() {
  return (
    <Card className="flex h-[calc(100vh-8rem)] flex-col" data-content-padding="false">
      <CardHeader>
        <CardTitle>Ask Bob</CardTitle>
        <CardDescription>
          Ask about a specific lot (&quot;why did lot 12 fail?&quot;), upcoming risk (&quot;what&apos;s at risk?&quot;),
          or the overall fab yield. Answers are generated from the same analysis the MCP tools expose to the IBM Bob
          agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <AssistantChat />
      </CardContent>
    </Card>
  );
}
