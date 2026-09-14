import { NextResponse } from "next/server";

import { z } from "zod";

import { answerAssistantMessage } from "@/lib/assistant";

const bodySchema = z.object({ message: z.string().min(1).max(2000) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const reply = await answerAssistantMessage(parsed.data.message);
  return NextResponse.json({ reply });
}
