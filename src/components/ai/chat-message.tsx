"use client";

import { memo, useState } from "react";
import { Bot, User, Wrench, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiToolTraceEntry } from "@/lib/ai/providers";
import { cn } from "@/lib/utils";

interface Props {
    role: "user" | "assistant";
    content: string;
    tools?: AiToolTraceEntry[] | null;
    streaming?: boolean;
}

function ToolTrace({ entries }: { entries: AiToolTraceEntry[] }) {
    const [open, setOpen] = useState(false);
    if (entries.length === 0) return null;
    return (
        <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-1.5 font-medium text-purple-700 dark:text-purple-300"
            >
                {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <Wrench className="size-3" />
                {entries.length} {entries.length === 1 ? "strumento usato" : "strumenti usati"}
            </button>
            {open && (
                <div className="space-y-2 border-t border-purple-500/20 px-3 py-2">
                    {entries.map((e, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                                <code className="rounded bg-purple-500/10 px-1 py-0.5 font-mono">{e.name}</code>
                                <span className="text-muted-foreground">{e.durationMs}ms</span>
                            </div>
                            {Object.keys(e.args).length > 0 && (
                                <details className="pl-4">
                                    <summary className="cursor-pointer text-muted-foreground">args</summary>
                                    <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
                                        {JSON.stringify(e.args, null, 2)}
                                    </pre>
                                </details>
                            )}
                            <details className="pl-4">
                                <summary className="cursor-pointer text-muted-foreground">risultato</summary>
                                <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
                                    {JSON.stringify(e.result, null, 2).slice(0, 2000)}
                                </pre>
                            </details>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const ChatMessage = memo(function ChatMessage({ role, content, tools, streaming }: Props) {
    const isUser = role === "user";
    return (
        <div className={cn("flex gap-2 w-full", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                    <Bot className="size-4 text-purple-500" />
                </div>
            )}
            <div className={cn("max-w-[85%] min-w-0", !isUser && "w-full")}>
                <div
                    className={cn(
                        "rounded-2xl px-4 py-2 text-sm leading-relaxed",
                        isUser ? "bg-blue-600 text-white whitespace-pre-wrap" : "bg-muted text-foreground assistant-markdown",
                    )}
                >
                    {isUser ? (
                        content
                    ) : (
                        <>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
                                    h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                                    ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-0.5">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-0.5">{children}</ol>,
                                    li: ({ children }) => <li className="leading-snug">{children}</li>,
                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    code: ({ children, className }) => {
                                        const inline = !className?.includes("language-");
                                        if (inline) return <code className="rounded bg-background/80 px-1 py-0.5 text-[0.85em] font-mono">{children}</code>;
                                        return <code className={className}>{children}</code>;
                                    },
                                    pre: ({ children }) => <pre className="my-2 rounded-lg bg-background/80 border border-border/60 p-3 overflow-x-auto text-[0.85em]">{children}</pre>,
                                    table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full text-xs border-collapse">{children}</table></div>,
                                    thead: ({ children }) => <thead className="bg-background/60">{children}</thead>,
                                    th: ({ children }) => <th className="border border-border/60 px-2 py-1 text-left font-semibold">{children}</th>,
                                    td: ({ children }) => <td className="border border-border/60 px-2 py-1">{children}</td>,
                                    blockquote: ({ children }) => <blockquote className="my-2 border-l-4 border-purple-500/50 pl-3 italic text-muted-foreground">{children}</blockquote>,
                                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 underline">{children}</a>,
                                    hr: () => <hr className="my-3 border-border/60" />,
                                }}
                            >
                                {content || (streaming ? "…" : "(nessuna risposta)")}
                            </ReactMarkdown>
                            {streaming && (
                                <span className="inline-block w-2 h-4 ml-0.5 bg-purple-500 animate-pulse align-middle" />
                            )}
                        </>
                    )}
                </div>
                {tools && tools.length > 0 && <ToolTrace entries={tools} />}
            </div>
            {isUser && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                    <User className="size-4 text-blue-500" />
                </div>
            )}
        </div>
    );
});
