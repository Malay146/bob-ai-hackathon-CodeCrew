"use client";

import { useRef, useState } from "react";

import { Bot, Send, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Spinner } from "@/components/ui/spinner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = ["What's the fab yield look like?", "What's at risk right now?", "Why did lot 5 fail?"];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I'm Bob. Ask me about a lot's root cause, upcoming batch risk, or the overall fab yield.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || pending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: data.reply ?? data.error ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: "Couldn't reach the analysis backend." },
      ]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div ref={viewportRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((m) => (
          <Message key={m.id} align={m.role === "user" ? "end" : "start"}>
            <MessageAvatar>
              <Avatar className="size-8">
                <AvatarFallback>
                  {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                </AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent>
              <Bubble align={m.role === "user" ? "end" : "start"}>
                <BubbleContent className="whitespace-pre-wrap">{m.text}</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        ))}
        {pending && (
          <Message align="start">
            <MessageAvatar>
              <Avatar className="size-8">
                <AvatarFallback>
                  <Bot className="size-4" />
                </AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent>
              <Bubble align="start">
                <BubbleContent>
                  <Spinner className="size-4" />
                </BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Button key={s} type="button" variant="outline" size="sm" onClick={() => void send(s)} disabled={pending}>
            {s}
          </Button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a lot, risk, or overall yield..."
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
