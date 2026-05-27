import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, Bot, User, Sparkles, TrendingUp, AlertTriangle, Lightbulb, BarChart3 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS_AR = [
  "ما هي توصياتك لتحسين أداء حملاتي؟",
  "كيف أزيد معدل النقر على إعلاناتي؟",
  "ما أفضل وقت لإطلاق الإعلانات في السوق السعودي؟",
  "حلل أداء إعلاناتي وأعطني نصائح",
  "ما هي أفضل استراتيجية للإعلان في رمضان؟",
];

const SUGGESTIONS_EN = [
  "What are your recommendations to improve my campaigns?",
  "How can I increase my ad click-through rate?",
  "When is the best time to run ads in Arab markets?",
  "Analyze my creative performance and give tips",
  "What's the best advertising strategy for Ramadan?",
];

export default function Copilot() {
  const { lang, isRTL } = useLang();
  const ar = lang === "ar";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const askMutation = useMutation({
    mutationFn: (question: string) => apiRequest("POST", "/api/copilot", { question }),
    onSuccess: (data: any) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "assistant", content: ar ? "عذراً، حدث خطأ. حاول مجدداً." : "Sorry, an error occurred. Please try again." }]);
    },
  });

  function sendMessage(text?: string) {
    const q = (text || input).trim();
    if (!q) return;
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setInput("");
    askMutation.mutate(q);
  }

  const suggestions = ar ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col gap-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{ar ? "مساعد الذكاء الاصطناعي" : "AI Copilot"}</h1>
            <p className="text-muted-foreground text-sm">{ar ? "مدعوم بـ Gemini AI — يحلل حملاتك ويعطيك توصيات فورية" : "Powered by Gemini AI — analyzes your campaigns and gives instant recommendations"}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="space-y-6 py-4">
            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, title: ar ? "تحليل الأداء" : "Performance Analysis", desc: ar ? "تحليل معدلات النقر والتحويل" : "Analyze CTR & conversion rates", color: "text-emerald-400 bg-emerald-500/10" },
                { icon: AlertTriangle, title: ar ? "تنبيهات ذكية" : "Smart Alerts", desc: ar ? "تحذيرات من الإعلانات الضعيفة" : "Warnings for underperforming ads", color: "text-amber-400 bg-amber-500/10" },
                { icon: Lightbulb, title: ar ? "توصيات فورية" : "Instant Recommendations", desc: ar ? "نصائح قابلة للتطبيق باللغة العربية" : "Actionable tips in Arabic", color: "text-blue-400 bg-blue-500/10" },
              ].map((c, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
                      <c.icon className="w-4 h-4" />
                    </div>
                    <p className="font-semibold text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {ar ? "أسئلة مقترحة:" : "Suggested questions:"}
              </p>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="w-full text-start p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-sm transition-all"
                    data-testid={`button-suggestion-${i}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? (isRTL ? "flex-row-reverse" : "flex-row-reverse") : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-primary"}`}>
              {msg.role === "assistant" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-primary-foreground" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "assistant" ? "bg-card border border-border/60" : "bg-primary text-primary-foreground"}`} dir={msg.role === "assistant" ? "auto" : undefined}>
              {msg.content.split("\n").map((line, j) => (
                <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {askMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-card border border-border/60 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{ar ? "يفكر الذكاء الاصطناعي…" : "AI is thinking…"}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            dir={isRTL ? "rtl" : "ltr"}
            placeholder={ar ? "اسألني عن أداء حملاتك أو استراتيجية الإعلانات…" : "Ask me about your campaign performance or ad strategy…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={2}
            className="resize-none"
            data-testid="input-copilot-message"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || askMutation.isPending}
            className="h-auto py-3 px-4"
            data-testid="button-copilot-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">{ar ? "مدعوم بـ Gemini AI · يحلل بياناتك ويقدم توصيات عملية" : "Powered by Gemini AI · Analyzes your data and provides actionable insights"}</p>
      </div>
    </div>
  );
}
