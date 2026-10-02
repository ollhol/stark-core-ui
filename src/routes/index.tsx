import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  Bot,
  ChevronRight,
  CirclePower,
  Cpu,
  Fan,
  Gauge,
  Home,
  Lightbulb,
  LockKeyhole,
  Mail,
  MemoryStick,
  Mic,
  Network,
  Power,
  Radio,
  Send,
  ShieldCheck,
  Settings,
  Speaker,
  VolumeX,
  Wrench,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "J.A.R.V.I.S. Home Terminal" },
      {
        name: "description",
        content: "A responsive J.A.R.V.I.S. command terminal with system telemetry, smart-home controls, communications, and voice output.",
      },
      { property: "og:title", content: "J.A.R.V.I.S. Home Terminal" },
      {
        property: "og:description",
        content: "A cinematic AI command center for telemetry, communications, and smart-home systems.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JarvisTerminal,
});

type CoreState = "idle" | "listening" | "thinking" | "responding";
type LogKind = "system" | "user" | "jarvis" | "alert";
type LogItem = { id: number; time: string; kind: LogKind; text: string };
type DeviceKey = "lab" | "grid" | "air" | "dock";

type Transmission = {
  id: number;
  sender: string;
  subject: string;
  preview: string;
  body: string;
  priority: "PRIORITY" | "ROUTINE" | "SECURE";
  time: string;
  unread: boolean;
};

const bootLogs: LogItem[] = [
  { id: 1, time: "18:16:52", kind: "system", text: "Stark Industries neural interface online." },
  { id: 2, time: "18:16:53", kind: "system", text: "Running diagnostics... 1,024 subsystems nominal." },
  { id: 3, time: "18:16:54", kind: "system", text: "Perimeter security synchronized." },
  { id: 4, time: "18:16:55", kind: "jarvis", text: "Good evening, sir. All systems are at your disposal." },
];

const transmissions: Transmission[] = [
  {
    id: 1,
    sender: "Pepper Potts",
    subject: "Board meeting moved",
    preview: "Tomorrow's meeting is now at 09:30...",
    body: "The board meeting has been moved to 09:30 tomorrow. I have asked everyone to keep it concise. Please try to arrive before the coffee does.",
    priority: "PRIORITY",
    time: "18:02",
    unread: true,
  },
  {
    id: 2,
    sender: "F.R.I.D.A.Y. Relay",
    subject: "Atmospheric scan complete",
    preview: "No anomalous energy signatures detected...",
    body: "Global atmospheric sweep complete. No anomalous energy signatures or unauthorized orbital entries detected. Satellite array remains on passive watch.",
    priority: "SECURE",
    time: "17:48",
    unread: true,
  },
  {
    id: 3,
    sender: "Happy Hogan",
    subject: "Garage inventory",
    preview: "The vintage roadster is back from service...",
    body: "The vintage roadster is back from service. Also, someone needs to explain why the workshop ordered forty-seven titanium coffee mugs.",
    priority: "ROUTINE",
    time: "16:31",
    unread: false,
  },
];

const replyFor = (command: string) => {
  const input = command.toLowerCase();
  if (input.includes("status") || input.includes("diagnostic")) return "Diagnostics complete. The house is secure, power reserves are optimal, and your calendar remains unnecessarily ambitious.";
  if (input.includes("weather")) return "Local conditions are clear at 14 degrees. I have taken the liberty of ruling out an alien invasion—for now.";
  if (input.includes("armor") || input.includes("suit")) return "Armor maintenance is at 92 percent. Mark VII continues to object to being called vintage.";
  if (input.includes("hello") || input.includes("jarvis")) return "At your service, sir. I was beginning to wonder whether you had forgotten the password again.";
  if (input.includes("lights")) return "Lighting controls are available in the home systems panel. A refreshingly low-risk request.";
  return `Command acknowledged: “${command}”. I have processed it with my usual discretion and only a trace of concern.`;
};

const DEFAULT_VOICE_ID = "saKBjKSb4DQcbYpRdPTc";

function nowStamp() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function JarvisTerminal() {
  const [now, setNow] = useState<Date | null>(null);
  const [metrics, setMetrics] = useState({ cpu: 38, memory: 62, ping: 12 });
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const [logs, setLogs] = useState<LogItem[]>(bootLogs);
  const [command, setCommand] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE_ID);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Transmission | null>(null);
  const [devices, setDevices] = useState<Record<DeviceKey, boolean>>({ lab: true, grid: true, air: true, dock: false });
  const timers = useRef<number[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLButtonElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const saved = window.localStorage.getItem("jarvis-voice-id");
    if (saved) setVoiceId(saved);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("jarvis-voice-id", voiceId);
  }, [voiceId]);

  const addLog = (kind: LogKind, text: string) => {
    setLogs((current) => [...current, { id: Date.now() + Math.random(), time: nowStamp(), kind, text }]);
  };

  const speakBrowser = (text: string) => new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((voice) => /en-GB/i.test(voice.lang) && /male|daniel|george|arthur|oliver/i.test(voice.name))
      ?? voices.find((voice) => /en-GB/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.92;
    utterance.pitch = 0.82;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });

  const stopAudio = () => {
    cancelAnimationFrame(rafRef.current);
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
    coreRef.current?.style.setProperty("--audio-level", "0");
    setSpeaking(false);
  };

  /** Plays ElevenLabs audio and drives the core pulse from the live audio level. Resolves when playback ends. */
  const speak = async (text: string): Promise<void> => {
    if (!voiceEnabled || typeof window === "undefined") return;
    stopAudio();
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: voiceId.trim() || DEFAULT_VOICE_ID }),
      });
      if (!response.ok) throw new Error(await response.text());
      const buffer = await response.arrayBuffer();
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      const audio = await ctx.decodeAudioData(buffer);
      const source = ctx.createBufferSource();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.buffer = audio;
      source.connect(analyser).connect(ctx.destination);
      sourceRef.current = source;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) { const d = (v - 128) / 128; sum += d * d; }
        const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
        coreRef.current?.style.setProperty("--audio-level", level.toFixed(3));
        rafRef.current = requestAnimationFrame(tick);
      };
      await new Promise<void>((resolve) => {
        source.onended = () => { stopAudio(); resolve(); };
        setSpeaking(true);
        source.start();
        tick();
      });
    } catch (error) {
      console.error("ElevenLabs voice unavailable, using browser voice", error);
      stopAudio();
      await speakBrowser(text);
    }
  };

  useEffect(() => {
    setNow(new Date());
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const telemetry = window.setInterval(() => {
      setMetrics((current) => ({
        cpu: Math.max(22, Math.min(78, current.cpu + Math.round(Math.random() * 10 - 5))),
        memory: Math.max(48, Math.min(82, current.memory + Math.round(Math.random() * 6 - 3))),
        ping: Math.max(8, Math.min(29, current.ping + Math.round(Math.random() * 6 - 3))),
      }));
    }, 2400);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(telemetry);
      timers.current.forEach(window.clearTimeout);
      window.speechSynthesis?.cancel();
      cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [logs]);

  const respond = async (response: string) => {
    setCoreState("responding");
    addLog("jarvis", response);
    if (voiceEnabled) await speak(response);
    else await new Promise((r) => timers.current.push(window.setTimeout(r, 1600)));
    setCoreState("idle");
  };

  const activateCore = () => {
    if (coreState !== "idle") return;
    setCoreState("listening");
    addLog("system", "Voice channel open. Listening for command...");
    timers.current.push(window.setTimeout(() => setCoreState("thinking"), 2600));
    timers.current.push(window.setTimeout(() => {
      void respond("All home systems are operating within normal parameters. No threats detected, though the refrigerator appears to be plotting something.");
    }, 4700));
  };

  const submitCommand = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    addLog("user", trimmed);
    setCommand("");
    setCoreState("thinking");
    timers.current.push(window.setTimeout(() => void respond(replyFor(trimmed)), 900));
  };

  const toggleDevice = (key: DeviceKey, name: string, nextValue: boolean) => {
    setDevices((current) => ({ ...current, [key]: nextValue }));
    addLog("system", `${name} ${nextValue ? "enabled" : "placed in standby"}.`);
  };

  const dateText = now?.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" }) ?? "Synchronizing date";
  const timeText = now?.toLocaleTimeString("en-GB", { hour12: false }) ?? "--:--:--";
  const coreLabel = useMemo(() => ({ idle: "SYSTEM READY", listening: "LISTENING...", thinking: "PROCESSING...", responding: "RESPONSE SENT" })[coreState], [coreState]);

  return (
    <main className="terminal-shell min-h-screen overflow-hidden bg-background text-foreground">
      <div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-30" aria-hidden="true" />
      <header className="border-b border-border/70 bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex size-10 shrink-0 items-center justify-center border border-primary/50 bg-primary/10 text-primary shadow-glow-sm">
              <Bot className="size-5" />
              <span className="absolute -right-1 -top-1 size-2 bg-primary shadow-glow-sm" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display text-sm font-semibold text-foreground sm:text-base">J.A.R.V.I.S.</p>
                <span className="hidden border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary sm:inline">HOME TERMINAL</span>
              </div>
              <p className="truncate font-mono text-[10px] text-muted-foreground">JUST A RATHER VERY INTELLIGENT SYSTEM</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-7">
            <div className="hidden items-center gap-2 text-xs text-success sm:flex">
              <span className="status-dot" />
              <span className="font-mono">ALL SYSTEMS NOMINAL</span>
            </div>
            <div className="text-right">
              <p className="font-display text-xl text-primary tabular-nums text-glow sm:text-2xl">{timeText}</p>
              <p className="font-mono text-[9px] uppercase text-muted-foreground sm:text-[10px]">{dateText}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:text-primary"
              onClick={() => setVoiceEnabled((enabled) => !enabled)}
              aria-label={voiceEnabled ? "Disable voice output" : "Enable voice output"}
              title={voiceEnabled ? "Voice output on" : "Voice output off"}
            >
              {voiceEnabled ? <Speaker /> : <VolumeX />}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(260px,0.75fr)_minmax(460px,1.6fr)_minmax(290px,0.85fr)] lg:p-8">
        <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Panel title="SYSTEM MATRIX" code="SYS.01" icon={<Activity />}>
            <div className="space-y-5">
              <Metric icon={<Cpu />} label="CPU LOAD" value={`${metrics.cpu}%`} progress={metrics.cpu} />
              <Metric icon={<MemoryStick />} label="MEMORY ALLOCATION" value={`${metrics.memory}%`} progress={metrics.memory} />
              <Metric icon={<Network />} label="NETWORK PING" value={`${metrics.ping} ms`} progress={Math.min(metrics.ping * 3, 100)} />
              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-5 text-success" />
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground">SECURITY FIREWALL</p>
                    <p className="font-display text-xs text-success">SECURE</p>
                  </div>
                </div>
                <LockKeyhole className="size-4 text-success" />
              </div>
            </div>
          </Panel>

          <Panel title="QUICK PROTOCOLS" code="QCK.04" icon={<Zap />}>
            <div className="grid grid-cols-2 gap-2">
              {[{ icon: <LockKeyhole />, label: "LOCKDOWN" }, { icon: <Radio />, label: "SCAN" }, { icon: <Gauge />, label: "DIAGNOSTICS" }, { icon: <Bell />, label: "ALERTS" }].map((item) => (
                <Button key={item.label} variant="outline" className="h-16 flex-col border-border bg-secondary/30 font-mono text-[9px] text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary" onClick={() => addLog("system", `${item.label} protocol initialized.`)}>
                  {item.icon}{item.label}
                </Button>
              ))}
            </div>
          </Panel>
        </aside>

        <section className="grid min-w-0 gap-4">
          <Panel title="NEURAL COMMAND INTERFACE" code="CORE.ACTIVE" icon={<Mic />} className="overflow-visible">
            <div className="grid items-center gap-6 py-3 xl:grid-cols-[240px_1fr]">
              <div className="flex flex-col items-center">
                <button className={`jarvis-core core-${coreState}`} onClick={activateCore} disabled={coreState !== "idle"} aria-label="Activate J.A.R.V.I.S. voice core">
                  <span className="core-orbit core-orbit-one" />
                  <span className="core-orbit core-orbit-two" />
                  <span className="core-radar" />
                  <span className="core-center"><Mic className="size-7" /></span>
                </button>
                <div className="mt-5 h-9 text-center">
                  <p className="font-display text-xs text-primary text-glow">{coreLabel}</p>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground">{coreState === "idle" ? "TAP CORE TO INITIALIZE VOICE LINK" : "NEURAL LINK ENGAGED"}</p>
                </div>
                {coreState === "listening" && <div className="mt-2 flex h-8 items-center gap-1" aria-label="Audio waveform">{[1,2,3,4,5,6,7,8,9].map((bar) => <span key={bar} className={`wave-bar wave-${bar}`} />)}</div>}
              </div>

              <div className="min-w-0 border-l-0 border-border/60 xl:border-l xl:pl-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><CirclePower className="size-3 text-primary" /> COMMAND STREAM</div>
                  <span className="font-mono text-[9px] text-success">● ENCRYPTED</span>
                </div>
                <div className="h-[270px] overflow-y-auto border border-border/60 bg-console p-4 font-mono text-[11px] leading-relaxed shadow-inner-panel sm:h-[310px]">
                  {logs.map((log) => (
                    <div key={log.id} className="mb-2 grid grid-cols-[64px_1fr] gap-2">
                      <span className="text-muted-foreground/60">[{log.time}]</span>
                      <span className={log.kind === "jarvis" ? "text-primary" : log.kind === "user" ? "text-accent" : log.kind === "alert" ? "text-warning" : "text-muted-foreground"}>
                        <span className="mr-1 opacity-60">{log.kind === "jarvis" ? "JARVIS›" : log.kind === "user" ? "USER›" : "SYS›"}</span>{log.text}
                      </span>
                    </div>
                  ))}
                  {coreState === "thinking" && <div className="flex items-center gap-2 text-primary"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /> processing neural request</div>}
                  <div ref={logEndRef} />
                </div>
                <form onSubmit={submitCommand} className="mt-3 flex border border-primary/30 bg-primary/5 focus-within:border-primary/70 focus-within:shadow-glow-sm">
                  <span className="flex items-center pl-3 font-mono text-primary">›</span>
                  <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Enter command protocol..." className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60" aria-label="Command input" />
                  <Button type="submit" size="icon" className="h-11 w-11 rounded-none bg-primary/15 text-primary shadow-none hover:bg-primary/25"><Send /></Button>
                </form>
              </div>
            </div>
          </Panel>

          <Panel title="SMART HOME SYSTEMS" code="HOME.07" icon={<Home />}>
            <div className="grid gap-2 sm:grid-cols-2">
              <DeviceControl icon={<Lightbulb />} name="LAB LIGHTS" detail="78% · Cool white" active={devices.lab} onChange={(value) => toggleDevice("lab", "Lab lights", value)} />
              <DeviceControl icon={<Power />} name="MAIN POWER GRID" detail="Arc reserve · 94%" active={devices.grid} onChange={(value) => toggleDevice("grid", "Main power grid", value)} />
              <DeviceControl icon={<Fan />} name="AIR FILTRATION" detail="HEPA cycle · Auto" active={devices.air} onChange={(value) => toggleDevice("air", "Air filtration", value)} />
              <DeviceControl icon={<Wrench />} name="ARMOR MAINTENANCE" detail="Dock 02 · Standby" active={devices.dock} onChange={(value) => toggleDevice("dock", "Armor maintenance dock", value)} />
            </div>
          </Panel>
        </section>

        <aside className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Panel title="COMMUNICATIONS" code="COM.12" icon={<Mail />}>
            <div className="space-y-2">
              <div className="mb-3 flex items-center justify-between font-mono text-[9px] text-muted-foreground"><span>INCOMING TRANSMISSIONS</span><span className="text-primary">02 UNREAD</span></div>
              {transmissions.map((message) => (
                <button key={message.id} onClick={() => setSelectedMessage(message)} className="group w-full border border-border/60 bg-secondary/20 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className={`size-1.5 shrink-0 ${message.unread ? "bg-primary shadow-glow-sm" : "bg-muted-foreground/40"}`} /><p className="truncate font-display text-[11px] text-foreground">{message.sender}</p></div>
                      <p className="mt-2 truncate font-mono text-[10px] text-primary/90">{message.subject}</p>
                      <p className="mt-1 line-clamp-2 font-mono text-[9px] leading-relaxed text-muted-foreground">{message.preview}</p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <div className="mt-3 flex items-center justify-between font-mono text-[8px]"><span className={message.priority === "PRIORITY" ? "text-warning" : "text-muted-foreground"}>{message.priority}</span><span className="text-muted-foreground">{message.time}</span></div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="ENERGY PROFILE" code="PWR.03" icon={<Zap />}>
            <div className="relative mx-auto flex aspect-square max-w-[210px] items-center justify-center">
              <div className="energy-ring" />
              <div className="absolute text-center"><p className="font-display text-3xl text-primary text-glow">84%</p><p className="mt-1 font-mono text-[9px] text-muted-foreground">ARC RESERVE</p></div>
            </div>
            <div className="grid grid-cols-3 border-t border-border/60 pt-3 text-center font-mono"><EnergyStat label="OUTPUT" value="7.2 GW" /><EnergyStat label="STABILITY" value="99.8%" /><EnergyStat label="RUNTIME" value="18.4 H" /></div>
          </Panel>
        </aside>
      </div>

      <footer className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-3 font-mono text-[8px] text-muted-foreground sm:px-8">
        <span>J.A.R.V.I.S. OS v7.4.2 // STARK SECURE NETWORK</span>
        <span className="flex items-center gap-2"><span className="status-dot" /> VOICE {voiceEnabled ? "ONLINE" : "MUTED"} · UPLINK STABLE</span>
      </footer>

      <Dialog open={selectedMessage !== null} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="border-primary/40 bg-popover/95 font-mono text-popover-foreground shadow-glow-lg backdrop-blur-2xl sm:rounded-none">
          <DialogHeader>
            <div className="mb-3 flex items-center gap-2 text-[9px] text-primary"><Radio className="size-3" /> DECRYPTED TRANSMISSION</div>
            <DialogTitle className="font-display text-lg text-primary">{selectedMessage?.subject}</DialogTitle>
            <DialogDescription className="font-mono text-[10px] text-muted-foreground">FROM: {selectedMessage?.sender} · {selectedMessage?.time} · {selectedMessage?.priority}</DialogDescription>
          </DialogHeader>
          <div className="my-2 border-y border-border/70 py-6 text-sm leading-7 text-foreground">{selectedMessage?.body}</div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground"><span>END OF TRANSMISSION</span><span className="text-success">SIGNATURE VERIFIED</span></div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Panel({ title, code, icon, children, className = "" }: { title: string; code: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`hologlass corner-cuts relative min-w-0 p-4 ${className}`}><div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3"><div className="flex items-center gap-2 font-display text-[11px] text-foreground [&_svg]:size-4 [&_svg]:text-primary">{icon}{title}</div><span className="font-mono text-[8px] text-primary/70">{code}</span></div>{children}</section>;
}

function Metric({ icon, label, value, progress }: { icon: React.ReactNode; label: string; value: string; progress: number }) {
  return <div><div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground [&_svg]:size-4 [&_svg]:text-primary">{icon}{label}</div><span className="font-display text-[11px] text-primary">{value}</span></div><Progress value={progress} className="h-1 rounded-none bg-primary/10 [&>div]:bg-primary [&>div]:shadow-glow-sm" /></div>;
}

function DeviceControl({ icon, name, detail, active, onChange }: { icon: React.ReactNode; name: string; detail: string; active: boolean; onChange: (value: boolean) => void }) {
  return <div className={`flex min-h-20 items-center justify-between border p-3 transition ${active ? "border-primary/35 bg-primary/5" : "border-border/60 bg-secondary/20"}`}><div className="flex min-w-0 items-center gap-3"><div className={`flex size-9 shrink-0 items-center justify-center border [&_svg]:size-4 ${active ? "border-primary/40 bg-primary/10 text-primary shadow-glow-sm" : "border-border bg-muted/30 text-muted-foreground"}`}>{icon}</div><div className="min-w-0"><p className="truncate font-display text-[10px] text-foreground">{name}</p><p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">{detail}</p></div></div><Switch checked={active} onCheckedChange={onChange} aria-label={`Toggle ${name}`} className="ml-2 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted" /></div>;
}

function EnergyStat({ label, value }: { label: string; value: string }) {
  return <div className="border-r border-border/50 px-1 last:border-r-0"><p className="text-[8px] text-muted-foreground">{label}</p><p className="mt-1 text-[10px] text-primary">{value}</p></div>;
}
