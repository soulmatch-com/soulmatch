"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Activity, ArrowDown, ArrowLeft, ArrowUp, Calculator, CalendarDays, Check, ChevronRight, Copy, Download, Eye, FileText, GripVertical, Layers, List, Loader2, Minus, MoreVertical, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CopyQuotationButton } from "./CopyQuotationButton";
import { QuotationActivityDialog } from "./QuotationActivityDialog";
import type { DraftItem, Lead, Quotation, Service } from "./QuotationManager";
import styles from "./QuotationEditor.module.css";

type Props = {
  quotationId: string;
  quotation?: Quotation;
  services: Service[];
  leads: Lead[];
  leadIds: string[];
  draftItems: DraftItem[];
  validUntil: string;
  notes: string;
  total: number;
  loading: boolean;
  loadFailed: boolean;
  onRetry: () => void;
  effectiveStatus: string;
  saving: boolean;
  readOnly: boolean;
  deleting: boolean;
  error: string;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onLeadChange: (id: string) => void;
  onRemoveLead: (id: string) => void;
  onValidityChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onItemChange: (id: string, field: "quantity" | "unitPrice" | "descriptionOverride", value: string) => void;
  onAddService: (item: DraftItem) => void;
  onRemoveService: (id: string) => void;
  onMoveService: (id: string, targetId: string) => void;
  onDelete: () => void;
  lifecycle: ReactNode;
  bookingAction: ReactNode;
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const cost = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const date = (value?: string) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function QuotationEditor(props: Props) {
  const { quotationId, quotation, services, leads, leadIds, draftItems, validUntil, notes, total, loading, saving, readOnly, error } = props;
  const [adding, setAdding] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabled = loading || props.loadFailed || saving || readOnly || !quotation;
  const availableServices = services.filter((service) => service.is_active !== false && !draftItems.some((item) => item.serviceId === service.id));
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  async function copyNumber() {
    if (!quotation) return;
    try {
      await navigator.clipboard.writeText(quotation.quotation_number);
      setCopied(true);
      setCopyError("");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { setCopyError("Unable to copy. Select the quotation number to copy it manually."); }
  }

  return <div className={styles.workspace}>
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <Link href="/admin/quotations" aria-label="Back to quotations"><ArrowLeft size={17} /></Link>
      <ChevronRight size={14} /><Link href="/admin/quotations">Quotations</Link><ChevronRight size={14} /><span aria-current="page">Edit Quotation</span>
    </nav>
    <header className={styles.pageHeader}>
      <div className={styles.heading}><span className={styles.pageIcon}><FileText size={30} /></span><div><h1>Edit Quotation</h1><p>Update services, prices, lead, validity and notes.</p></div></div>
      <div className={styles.toolbar}>
        <Button variant="outline" className={styles.outlineButton} disabled={loading || !quotation} onClick={() => setPreviewing(true)}><Eye size={18} />Preview</Button>
        <CopyQuotationButton quotationId={quotationId} showLabel className={styles.outlineButton} disabled={loading || props.loadFailed || !quotation || saving} />
        <Button type="submit" form="quotation-edit-form" className={styles.primaryButton} disabled={disabled || !draftItems.length}><Save size={17} />{saving ? "Saving…" : "Save Changes"}</Button>
      </div>
    </header>

    <section className={`${styles.card} ${styles.metadata}`} aria-label="Quotation information" aria-busy={loading}>
      <div className={styles.identity}><button type="button" className={styles.quotationNumber} onClick={() => void copyNumber()} disabled={!quotation} aria-label={copied ? "Quotation number copied" : "Copy quotation number"}><span>{quotation?.quotation_number || (loading ? "Loading quotation…" : "Quotation unavailable")}</span>{copied ? <Check size={17} /> : <Copy size={17} />}</button>{quotation && <span className={styles.badge} data-status={props.effectiveStatus || quotation.status}>{title(props.effectiveStatus || quotation.status)}</span>}</div>
      <div className={styles.timestamp}><CalendarDays size={24} /><div><span>Created on</span><p>{date(quotation?.created_at)}</p></div></div>
      <div className={styles.timestamp}><Pencil size={23} /><div><span>Last updated</span><p>{date(quotation?.updated_at)}</p></div></div>
    </section>
    {copyError && <p role="alert" className={styles.error}>{copyError}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {props.loadFailed && <Button type="button" variant="outline" onClick={props.onRetry} className="mb-5">Retry loading</Button>}
    {readOnly && <p role="status" className={styles.notice}>This quotation is {quotation?.status} and cannot be edited. Create a new quotation to make changes.</p>}

    <div className={styles.columns}>
      <form id="quotation-edit-form" onSubmit={props.onSave} className={styles.editor} aria-busy={loading}>
        <fieldset disabled={disabled} className={styles.fieldset}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}><List />Quotation Details</h2>
            <div className={styles.details}>
              <div><label htmlFor="quotation-lead">Customer lead (optional)</label><select id="quotation-lead" value={leadIds.length === 1 ? leadIds[0] : ""} onChange={(event) => props.onLeadChange(event.target.value)}><option value="">Select an active lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.contact_name} — {lead.mobile || lead.email || "No contact"}</option>)}</select>
                {leadIds.length > 1 && <p role="alert" className={styles.leadWarning}>Keep one lead before saving. Copy the quotation for additional customers.</p>}
                {leadIds.map((id) => <button key={id} type="button" className={styles.leadChip} onClick={() => props.onRemoveLead(id)}>{leads.find((lead) => lead.id === id)?.contact_name} ×</button>)}
              </div>
              <div><label htmlFor="quotation-valid-until">Valid until</label><input id="quotation-valid-until" type="date" value={validUntil} onChange={(event) => props.onValidityChange(event.target.value)} /></div>
              <div><label htmlFor="quotation-notes">Notes for the family</label><textarea id="quotation-notes" rows={2} value={notes} maxLength={2000} onChange={(event) => props.onNotesChange(event.target.value)} /></div>
            </div>
          </section>

          <section className={`${styles.card} ${styles.services}`}>
            <div className={styles.servicesHeading}><h2 className={styles.cardTitle}><Layers />Services</h2><Button type="button" className={styles.primaryButton} disabled={!availableServices.length || draftItems.length >= 100} onClick={() => setAdding(true)}><Plus size={16} />Add Service</Button></div>
            {loading ? <div className={styles.empty}><Loader2 className="animate-spin" size={22} />Loading service catalogue…</div> : draftItems.length === 0 ? <div className={styles.empty}><Layers size={30} /><p>{services.length ? "Add a service to start this quotation." : "No active celebration services are available."}</p></div> : <div className={styles.serviceTable}>
              <div className={styles.tableHead} aria-hidden="true"><span>#</span><span>Service</span><span>Description</span><span>Cost (₹)</span><span>Qty</span><span>Total (₹)</span><span /></div>
              {draftItems.map((item, index) => {
                const service = services.find((candidate) => candidate.id === item.serviceId);
                const name = service?.name || "Unavailable service";
                return <div key={item.serviceId} className={styles.serviceRow} data-drop-target={dropId === item.serviceId || undefined}
                  onDragOver={(event) => { if (disabled || !draggedId) return; event.preventDefault(); setDropId(item.serviceId); }}
                  onDrop={(event) => { event.preventDefault(); if (!disabled && draggedId) props.onMoveService(draggedId, item.serviceId); setDraggedId(null); setDropId(null); }}>
                  <div className={styles.rowNumber}><button type="button" draggable={!disabled} aria-label={`Drag ${name} to change its position`} title="Drag to reorder, or use the service menu" onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.serviceId); setDraggedId(item.serviceId); }} onDragEnd={() => { setDraggedId(null); setDropId(null); }}><GripVertical size={16} /></button><span>{index + 1}</span></div>
                  <p className={styles.serviceName}>{name}{service?.is_active === false && <span className={styles.inactiveService}>Inactive service</span>}</p>
                  <div className={styles.description}>{service?.show_description_in_quotation ? <label><span className="sr-only">Quotation description (this quotation only)</span><textarea rows={2} maxLength={1000} value={item.descriptionOverride} placeholder="Add a description" onChange={(event) => props.onItemChange(item.serviceId, "descriptionOverride", event.target.value)} /></label> : <span>—</span>}</div>
                  <label className={styles.cost}><span className={styles.mobileLabel}>Cost (₹)</span><input aria-label={`Cost for ${name}`} type="number" min="0" max="99999999" step="0.01" required value={item.unitPrice} onChange={(event) => props.onItemChange(item.serviceId, "unitPrice", event.target.value)} /></label>
                  <div className={styles.quantityCell}><span className={styles.mobileLabel}>Quantity</span><div className={styles.stepper}><button type="button" aria-label={`Decrease quantity for ${name}`} disabled={Number(item.quantity) <= 1} onClick={() => props.onItemChange(item.serviceId, "quantity", String(Math.max(1, Number(item.quantity) - 1)))}><Minus size={13} /></button><input aria-label={`Quantity for ${name}`} type="number" min="1" max="10000" required value={item.quantity} onChange={(event) => props.onItemChange(item.serviceId, "quantity", event.target.value)} /><button type="button" aria-label={`Increase quantity for ${name}`} disabled={Number(item.quantity) >= 10000} onClick={() => props.onItemChange(item.serviceId, "quantity", String(Math.min(10000, (Number(item.quantity) || 0) + 1)))}><Plus size={13} /></button></div></div>
                  <div className={styles.lineTotal}><span className={styles.mobileLabel}>Total (₹)</span><strong>{cost.format((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</strong></div>
                  <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className={styles.rowMenu} aria-label={`Actions for ${name}`} disabled={disabled}><MoreVertical size={20} /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={index === 0} onSelect={() => props.onMoveService(item.serviceId, draftItems[index - 1].serviceId)}><ArrowUp size={15} className="mr-2" />Move up</DropdownMenuItem><DropdownMenuItem disabled={index === draftItems.length - 1} onSelect={() => props.onMoveService(item.serviceId, draftItems[index + 1].serviceId)}><ArrowDown size={15} className="mr-2" />Move down</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-700" onSelect={() => props.onRemoveService(item.serviceId)}><Trash2 size={15} className="mr-2" />Remove service</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </div>;
              })}
            </div>}
          </section>
        </fieldset>
      </form>

      <aside className={styles.summaryColumn} aria-label="Quotation summary and actions">
        <section className={styles.card}><h2 className={styles.cardTitle}><Calculator />Quotation Summary</h2><div className={styles.summaryBody}><div className={styles.summaryLine}><span>Services</span><span>{draftItems.length} {draftItems.length === 1 ? "item" : "items"}</span></div><div className={styles.total}><strong>Quotation Total</strong><strong>{money.format(total)}</strong></div></div></section>
        <section className={styles.card}><h2 className={styles.cardTitle}><Activity />Lifecycle</h2><div className={styles.lifecycleBody}>{props.lifecycle}{props.bookingAction}</div></section>
        <QuotationActivityDialog quotationId={quotationId} quotationNumber={quotation?.quotation_number} disabled={loading || props.loadFailed || !quotation} />
        <section className={`${styles.card} ${styles.deleteCard}`}><h2><Trash2 size={22} />Delete Quotation</h2><p>This permanently removes the quotation and its related history. Quotations linked to a booking cannot be deleted.</p><Button type="button" variant="outline" disabled={!quotation || props.deleting} onClick={props.onDelete}><Trash2 size={16} />{props.deleting ? "Deleting…" : "Delete Quotation"}</Button></section>
      </aside>
    </div>
    <AddServiceDialog open={adding && !disabled} onOpenChange={setAdding} services={availableServices} onAdd={(item) => { if (!disabled) props.onAddService(item); setAdding(false); }} />
    <QuotationPreview quotationId={quotationId} quotationNumber={quotation?.quotation_number} open={previewing} onOpenChange={setPreviewing} />
  </div>;
}

function AddServiceDialog({ open, onOpenChange, services, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; services: Service[]; onAdd: (item: DraftItem) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={styles.serviceDialog}><DialogHeader><DialogTitle>Add Service</DialogTitle><DialogDescription>Select a service and set its price and quantity for this quotation.</DialogDescription></DialogHeader>
    <form onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); const serviceId = String(values.get("service")); const service = services.find((candidate) => candidate.id === serviceId); if (service) onAdd({ serviceId, unitPrice: String(values.get("price")), quantity: String(values.get("quantity")), descriptionOverride: service.description || "" }); }}>
      <label htmlFor="add-quotation-service">Service</label><select id="add-quotation-service" name="service" required defaultValue=""><option value="" disabled>Choose a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>
      <div className={styles.dialogFields}><div><label htmlFor="add-quotation-price">Cost (₹)</label><input id="add-quotation-price" name="price" type="number" min="0" max="99999999" step="0.01" required placeholder="0.00" /></div><div><label htmlFor="add-quotation-quantity">Quantity</label><input id="add-quotation-quantity" name="quantity" type="number" min="1" max="10000" required defaultValue="1" /></div></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className={styles.primaryButton}><Plus size={16} />Add Service</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

function QuotationPreview({ quotationId, quotationNumber, open, onOpenChange }: { quotationId: string; quotationNumber?: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [pdf, setPdf] = useState<{ url?: string; error?: string }>({});
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      setPdf({});
      try {
        const response = await fetch(`/api/admin/quotations/${quotationId}/pdf`, { signal: controller.signal });
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Unable to load quotation preview."); }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPdf({ url: objectUrl });
      } catch (error) { if (!controller.signal.aborted) setPdf({ error: error instanceof Error ? error.message : "Unable to load quotation preview." }); }
    }
    void load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, quotationId]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={styles.previewDialog}><DialogHeader><DialogTitle>Quotation preview</DialogTitle><DialogDescription>Preview of the saved quotation. Save your changes before previewing updated details.</DialogDescription></DialogHeader>{pdf.error ? <p role="alert" className={styles.error}>{pdf.error}</p> : pdf.url ? <iframe title="Quotation PDF preview" src={pdf.url} className={styles.pdf} /> : <div className={styles.empty}><Loader2 size={24} className="animate-spin" />Preparing preview…</div>}<DialogFooter>{pdf.url && <Button asChild className={styles.primaryButton}><a href={pdf.url} download={`${quotationNumber || "quotation"}.pdf`}><Download size={16} />Download PDF</a></Button>}</DialogFooter></DialogContent></Dialog>;
}
