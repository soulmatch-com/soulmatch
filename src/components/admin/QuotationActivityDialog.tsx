"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, FileText, History, Loader2, RotateCcw, Send, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildQuotationTimeline, type QuotationActivityData, type QuotationTimelineEntry } from "./quotation-activity";
import editorStyles from "./QuotationEditor.module.css";
import styles from "./QuotationActivityDialog.module.css";

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const timestamp = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const calendarDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const icons = { created: FileText, status_transition: ArrowRight, expired: Timer, reopened: RotateCcw, delivery_recorded: Send };
const channels = { manual: "Manual handoff", email: "Email", whatsapp: "WhatsApp" };

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: QuotationActivityData };

export function QuotationActivityDialog({ quotationId, quotationNumber, disabled }: { quotationId: string; quotationNumber?: string; disabled?: boolean }) {
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" className={`${editorStyles.card} ${editorStyles.history}`} disabled={disabled}>
        <span><span className={editorStyles.historyTitle}><History aria-hidden="true" />Quotation History</span><span className={editorStyles.historyDescription}>View status changes and recorded deliveries for this quotation.</span></span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </DialogTrigger>
    <DialogContent className={styles.dialog}>
      <ActivityContent key={quotationId} quotationId={quotationId} quotationNumber={quotationNumber} />
    </DialogContent>
  </Dialog>;
}

function ActivityContent({ quotationId, quotationNumber }: { quotationId: string; quotationNumber?: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/admin/quotations/${quotationId}/lifecycle`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load quotation activity.");
        if (data?.quotation?.id !== quotationId || !Array.isArray(data.activity) || !Array.isArray(data.deliveries)) throw new Error("Unable to load quotation activity.");
        if (!controller.signal.aborted) setState({ status: "ready", data });
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: "error", message: error instanceof Error ? error.message : "Unable to load quotation activity." });
      }
    }
    void load();
    return () => controller.abort();
  }, [quotationId, attempt]);

  const data = state.status === "ready" ? state.data : null;
  const entries = data ? buildQuotationTimeline(data) : [];
  const hasLifecycleEvents = entries.some((entry) => entry.kind !== "created");
  return <>
    <DialogHeader className={styles.header}>
      <div className={styles.heading}><span className={styles.headingIcon}><History size={24} aria-hidden="true" /></span><div><DialogTitle>Quotation activity</DialogTitle><p className={styles.quotationNumber}>{data?.quotation.quotation_number || quotationNumber}</p></div></div>
      <DialogDescription>Status changes and recorded deliveries for this quotation, newest first.</DialogDescription>
    </DialogHeader>
    <div className={styles.body} aria-busy={state.status === "loading"}>
      {state.status === "loading" && <p role="status" className={styles.message}><Loader2 size={22} className="animate-spin" aria-hidden="true" />Loading quotation activity…</p>}
      {state.status === "error" && <div className={styles.error}><p role="alert">{state.message}</p><Button type="button" variant="outline" onClick={() => { setState({ status: "loading" }); setAttempt((current) => current + 1); }}><RotateCcw size={15} aria-hidden="true" />Retry</Button></div>}
      {data && <>
        {data.effectiveStatus === "expired" && data.quotation.status === "sent" && <p className={styles.expiryNote}>This quotation is currently expired based on its validity date{data.quotation.valid_until ? ` (${calendarDate(data.quotation.valid_until)})` : ""}. This is a calculated status.</p>}
        {!hasLifecycleEvents && <p className={styles.empty}>No lifecycle changes or deliveries have been recorded yet.</p>}
        {entries.length > 0 && <ol className={styles.timeline} aria-label="Quotation activity timeline">{entries.map((entry) => <ActivityEntry key={entry.id} entry={entry} />)}</ol>}
      </>}
    </div>
    <p className={styles.footer}>Read-only activity for this quotation.</p>
  </>;
}

function ActivityEntry({ entry }: { entry: QuotationTimelineEntry }) {
  const Icon = icons[entry.kind];
  const delivery = entry.delivery;
  return <li className={styles.entry}>
    <span className={styles.eventIcon}><Icon size={17} aria-hidden="true" /></span>
    <article className={styles.event}>
      <h3>{entry.title}</h3>
      <time dateTime={entry.timestamp}>{timestamp(entry.timestamp)}</time>
      {(entry.previousStatus || entry.newStatus) && <p className={styles.statusChange}>{entry.previousStatus && <span>{title(entry.previousStatus)}</span>}{entry.previousStatus && entry.newStatus && <ArrowRight size={14} aria-label="changed to" />}{entry.newStatus && <span>{title(entry.newStatus)}</span>}</p>}
      {entry.renewedValidity && <p className={styles.detail}>Valid until {calendarDate(entry.renewedValidity)}</p>}
      {delivery && <><dl className={styles.delivery}><div><dt>Recipient</dt><dd>{delivery.recipient_name}</dd></div><div><dt>Contact</dt><dd>{delivery.recipient_contact}</dd></div><div><dt>Channel</dt><dd>{channels[delivery.channel]}</dd></div></dl>{delivery.notes && <p className={styles.notes}>{delivery.notes}</p>}{delivery.delivery_kind === "manual" && <p className={styles.detail}>Manually recorded; delivery is not verified.</p>}</>}
      {entry.kind === "delivery_recorded" && !delivery && <p className={styles.detail}>Delivery details are unavailable.</p>}
    </article>
  </li>;
}
