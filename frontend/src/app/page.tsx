"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText, Upload, BookOpen, Trash2,
  Loader2, Send, X, CheckCircle2, AlertCircle, Sun, Moon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";
type FileStatus = "uploading" | "ready" | "error";

interface UploadedFile {
  uid: string;
  filename: string;
  session_id: string;
  status: FileStatus;
  error?: string;
}

interface Message {
  id: string;
  role: Role;
  content: string;
  sourcePages?: number[];
}

async function uploadPDF(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const d = err.detail;
    throw new Error(typeof d === "string" ? d : (JSON.stringify(d) ?? "Upload failed"));
  }
  const data = await res.json();
  return data.session_id as string;
}

async function askQuestion(
  sessionIds: string[],
  question: string,
): Promise<{ answer: string; source_pages: number[] }> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_ids: sessionIds, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const d = err.detail;
    throw new Error(typeof d === "string" ? d : (JSON.stringify(d) ?? "Request failed"));
  }
  return res.json();
}

export default function Home() {
  const [dark, setDark] = useState(true);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync dark-mode class on <html>
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const readyFiles = files.filter((f) => f.status === "ready");
  const hasReady = readyFiles.length > 0;

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleFiles(incoming: FileList | File[]) {
    const pdfs = Array.from(incoming).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );
    if (!pdfs.length) return;

    const newEntries: UploadedFile[] = pdfs.map((f) => ({
      uid: crypto.randomUUID(),
      filename: f.name,
      session_id: "",
      status: "uploading",
    }));
    setFiles((prev) => [...prev, ...newEntries]);

    await Promise.all(
      pdfs.map(async (file, i) => {
        const uid = newEntries[i].uid;
        try {
          const session_id = await uploadPDF(file);
          setFiles((prev) =>
            prev.map((f) => (f.uid === uid ? { ...f, session_id, status: "ready" } : f)),
          );
        } catch (e: unknown) {
          setFiles((prev) =>
            prev.map((f) =>
              f.uid === uid ? { ...f, status: "error", error: (e as Error).message } : f,
            ),
          );
        }
      }),
    );
  }

  function removeFile(uid: string) {
    setFiles((prev) => prev.filter((f) => f.uid !== uid));
  }

  async function handleSend() {
    if (!input.trim() || !hasReady || thinking) return;
    const question = input.trim();
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: question }]);
    scrollToBottom();
    setThinking(true);

    try {
      const data = await askQuestion(readyFiles.map((f) => f.session_id), question);
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: data.answer, sourcePages: data.source_pages },
      ]);
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: `**Error:** ${(e as Error).message}` },
      ]);
    } finally {
      setThinking(false);
      scrollToBottom();
    }
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center py-12 px-4 transition-colors duration-300",
      "bg-cream-100 dark:bg-midnight-950",
    )}>

      {/* Header */}
      <header className="w-full max-w-2xl mb-8 flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-xl border",
          "bg-indigo-50 border-indigo-200 text-indigo-600",
          "dark:bg-indigo-600/20 dark:border-indigo-500/30 dark:text-indigo-400",
        )}>
          <BookOpen size={20} />
        </div>

        <div>
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 leading-tight">
            PDF Reader AI
          </h1>
          <p className="text-xs text-cream-500 dark:text-midnight-200 mt-0.5 opacity-70">
            Ask questions about any PDF
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "p-2 rounded-xl border transition-colors",
              "bg-cream-200 border-cream-300 text-cream-500 hover:text-indigo-600 hover:border-indigo-300",
              "dark:bg-midnight-800 dark:border-midnight-700 dark:text-midnight-200 dark:hover:text-indigo-400 dark:hover:border-indigo-800",
            )}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {files.length > 0 && (
            <button
              onClick={() => { setFiles([]); setMessages([]); setInput(""); }}
              className="flex items-center gap-1.5 text-xs text-cream-500 dark:text-midnight-200 opacity-60 hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-all"
            >
              <X size={13} /> Reset
            </button>
          )}
        </div>
      </header>

      {/* Upload zone */}
      <div
        className={cn(
          "relative w-full max-w-2xl rounded-2xl border-2 border-dashed p-8",
          "flex flex-col items-center gap-4 cursor-pointer transition-all duration-200 mb-4",
          dragOver
            ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/30"
            : [
                "border-cream-300 bg-white hover:border-indigo-300 hover:bg-cream-50",
                "dark:border-midnight-700 dark:bg-midnight-900/50 dark:hover:border-midnight-200/30",
              ],
        )}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
        />
        <div className={cn(
          "p-3 rounded-2xl border",
          "bg-indigo-50 border-indigo-200 text-indigo-500",
          "dark:bg-indigo-950/60 dark:border-indigo-500/20 dark:text-indigo-400",
        )}>
          <Upload size={22} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm text-slate-700 dark:text-midnight-50">
            {files.length > 0 ? "Add more PDFs" : "Drop PDFs here, or click to browse"}
          </p>
          <p className="text-xs mt-0.5 text-cream-500 dark:text-midnight-200 opacity-60">
            Multiple files supported
          </p>
        </div>
      </div>

      {/* Uploaded file chips */}
      {files.length > 0 && (
        <div className="w-full max-w-2xl mb-4 flex flex-wrap gap-2">
          {files.map((f) => (
            <div
              key={f.uid}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                f.status === "ready" && [
                  "bg-white border-cream-300 text-slate-700",
                  "dark:bg-midnight-800 dark:border-midnight-700 dark:text-midnight-50",
                ],
                f.status === "uploading" && [
                  "bg-cream-100 border-cream-200 text-cream-500",
                  "dark:bg-midnight-900/60 dark:border-midnight-700/50 dark:text-midnight-200",
                ],
                f.status === "error" && [
                  "bg-red-50 border-red-200 text-red-600",
                  "dark:bg-red-950/40 dark:border-red-800/50 dark:text-red-400",
                ],
              )}
            >
              {f.status === "uploading" && <Loader2 size={13} className="animate-spin text-indigo-500 shrink-0" />}
              {f.status === "ready"    && <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400 shrink-0" />}
              {f.status === "error"    && <AlertCircle  size={13} className="text-red-500 shrink-0" />}

              <FileText size={13} className="shrink-0 text-indigo-500 dark:text-indigo-400" />

              <span className="max-w-[180px] truncate" title={f.filename}>{f.filename}</span>

              {f.status === "uploading" && (
                <span className="text-[10px] opacity-50 ml-1">Indexing…</span>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); removeFile(f.uid); }}
                className="ml-1 opacity-40 hover:opacity-100 hover:text-red-500 transition-all"
                title="Remove"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat panel */}
      {hasReady && (
        <div className={cn(
          "w-full max-w-2xl flex flex-col rounded-2xl border overflow-hidden shadow-lg",
          "bg-white border-cream-300",
          "dark:bg-midnight-900/80 dark:border-midnight-700",
        )}>
          {/* Toolbar */}
          <div className={cn(
            "flex items-center justify-between px-4 py-2.5 border-b text-xs",
            "bg-cream-100 border-cream-200 text-cream-500",
            "dark:bg-midnight-950/60 dark:border-midnight-700 dark:text-midnight-200",
          )}>
            <span>
              Querying{" "}
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {readyFiles.length}
              </span>{" "}
              PDF{readyFiles.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => { setMessages([]); setInput(""); }}
              disabled={messages.length === 0 || thinking}
              className="flex items-center gap-1 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={12} /> Clear chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[520px] min-h-[240px]">
            {messages.length === 0 && (
              <div className={cn(
                "flex flex-col items-center justify-center h-40 gap-2",
                "text-cream-400 dark:text-midnight-200 opacity-40",
              )}>
                <FileText size={28} />
                <p className="text-sm">Ask anything about your PDF{readyFiles.length > 1 ? "s" : ""}</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "rounded-2xl text-sm leading-relaxed",
                  msg.role === "user"
                    ? "max-w-[80%] px-4 py-3 bg-indigo-600 text-white rounded-br-sm"
                    : cn(
                        "w-full px-5 py-4 rounded-bl-sm border",
                        "bg-cream-50 border-cream-200 text-slate-700",
                        "dark:bg-midnight-800 dark:border-midnight-700 dark:text-midnight-50",
                      ),
                )}>
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {msg.sourcePages && msg.sourcePages.length > 0 && (
                    <p className={cn(
                      "mt-2 pt-1.5 text-[11px] border-t",
                      msg.role === "user"
                        ? "border-white/20 opacity-60"
                        : "border-cream-300 dark:border-midnight-700 opacity-50",
                    )}>
                      Source page{msg.sourcePages.length > 1 ? "s" : ""}: {msg.sourcePages.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className={cn(
                  "rounded-2xl rounded-bl-sm px-4 py-3 border",
                  "bg-cream-50 border-cream-200",
                  "dark:bg-midnight-800 dark:border-midnight-700",
                )}>
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={cn(
            "border-t p-3 flex gap-2",
            "bg-cream-50 border-cream-200",
            "dark:bg-midnight-950/40 dark:border-midnight-700",
          )}>
            <input
              className={cn(
                "flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition",
                "bg-white border-cream-300 text-slate-800 placeholder-cream-400",
                "focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300",
                "disabled:opacity-50",
                "dark:bg-midnight-900 dark:border-midnight-700 dark:text-midnight-50 dark:placeholder-midnight-200/40",
                "dark:focus:ring-indigo-500/40 dark:focus:border-indigo-500/40",
              )}
              placeholder={thinking ? "Waiting for answer…" : "Ask a question about the PDF…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={thinking}
            />
            <ShimmerButton
              onClick={handleSend}
              disabled={!input.trim() || thinking}
              background="rgba(79,70,229,1)"
              borderRadius="12px"
              shimmerColor="#a5b4fc"
              className="px-3 py-2.5"
            >
              {thinking ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </ShimmerButton>
          </div>
        </div>
      )}
    </div>
  );
}
