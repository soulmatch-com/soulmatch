"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuotationBookingAction } from "@/components/admin/QuotationBookingAction";
import { CopyQuotationButton } from "@/components/admin/CopyQuotationButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Service = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  show_description_in_quotation: boolean;
};
type Quotation = {
  id: string;
  quotation_number: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "cancelled";
  valid_until: string | null;
  notes: string | null;
  total_amount: number;
  created_at: string;
};
type QuotationItem = {
  id: string;
  quotation_id: string;
  celebration_service_id: string;
  service_name: string;
  description_override: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};
type QuotationState = Pick<Quotation, "id" | "status" | "valid_until">;
type DraftItem = { serviceId: string; quantity: string; unitPrice: string; descriptionOverride: string };
type Lead = {
  id: string;
  contact_name: string;
  mobile: string | null;
  email: string | null;
};
type QuotationLead = { quotation_id: string; lead_id: string };

const statuses = ["draft", "sent", "accepted", "rejected", "expired", "cancelled"] as const;
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const title = (value: string) =>
  value.replace(/\b\w/g, (letter) => letter.toUpperCase());

export function QuotationManager({ quotationId, initialLeadId, returnTo }: { quotationId?: string; initialLeadId?: string; returnTo?: string }) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [links, setLinks] = useState<QuotationLead[]>([]);
  const [leadIds, setLeadIds] = useState<string[]>([]);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [selectedUnitPrice, setSelectedUnitPrice] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [deletingQuotation, setDeletingQuotation] = useState(false);
  const [draggedServiceId, setDraggedServiceId] = useState<string | null>(null);
  const [dropTargetServiceId, setDropTargetServiceId] = useState<string | null>(null);
  const currentQuotation = quotations.find((quotation) => quotation.id === quotationId);
  const isReadOnly = !!currentQuotation && ["accepted", "rejected", "cancelled"].includes(currentQuotation.status);
  const handleQuotationChange = useCallback((updated: QuotationState) => {
    setQuotations((current) => current.map((quotation) => quotation.id === updated.id ? { ...quotation, ...updated } : quotation));
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/admin/quotations"), initialLeadId ? fetch(`/api/admin/leads/${initialLeadId}`) : Promise.resolve(null)])
      .then(async ([response, leadResponse]) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load quotations.");
        setServices(data.services);
        setQuotations(data.quotations);
        setItems(data.items);
        setLeads(data.leads);
        setLinks(data.links);
        if (leadResponse) {
          const context = await leadResponse.json();
          if (!leadResponse.ok || context.lead.status === "expired") throw new Error(context.error || "This lead is no longer available for quotations.");
          setLeads((current) => current.some((lead) => lead.id === context.lead.id) ? current : [context.lead, ...current]);
          setLeadIds([context.lead.id]);
          const active = new Set(data.services.map((service: Service) => service.id));
          setDraftItems((context.enquiryServices || []).filter((service: { service_id: string }) => active.has(service.service_id)).map((service: { service_id: string }) => ({ serviceId: service.service_id, quantity: "1", unitPrice: "", descriptionOverride: data.services.find((catalogueService: Service) => catalogueService.id === service.service_id)?.description || "" })));
        }
        if (quotationId) {
          const quotation = data.quotations.find(
            (candidate: Quotation) => candidate.id === quotationId,
          );
          if (!quotation) throw new Error("Quotation not found.");
          setValidUntil(quotation.valid_until || "");
          setNotes(quotation.notes || "");
          const activeLeadIds = new Set(
            data.leads.map((lead: Lead) => lead.id),
          );
          setLeadIds(
            data.links
              .filter(
                (link: QuotationLead) =>
                  link.quotation_id === quotationId &&
                  activeLeadIds.has(link.lead_id),
              )
              .map((link: QuotationLead) => link.lead_id),
          );
          setDraftItems(
            data.items
              .filter(
                (item: QuotationItem) => item.quotation_id === quotationId,
              )
              .map((item: QuotationItem) => ({
                serviceId: item.celebration_service_id,
                quantity: String(item.quantity),
                unitPrice: String(item.unit_price),
                descriptionOverride: (item.description_override ?? data.services.find((service: Service) => service.id === item.celebration_service_id)?.description) || "",
              })),
          );
        }
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Unable to load quotations.",
        ),
      )
      .finally(() => setLoading(false));
  }, [quotationId, initialLeadId]);

  const total = useMemo(
    () =>
      draftItems.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0,
      ),
    [draftItems],
  );
  function addService() {
    if (
      !selectedServiceId ||
      draftItems.some((item) => item.serviceId === selectedServiceId)
    )
      return;
    setDraftItems((current) => [
      ...current,
      {
        serviceId: selectedServiceId,
        quantity: selectedQuantity,
        unitPrice: selectedUnitPrice,
        descriptionOverride: services.find((service) => service.id === selectedServiceId)?.description || "",
      },
    ]);
    setSelectedServiceId("");
    setSelectedQuantity("1");
    setSelectedUnitPrice("");
  }
  function removeService(serviceId: string) {
    setDraftItems((current) =>
      current.filter((item) => item.serviceId !== serviceId),
    );
  }
  function changeItem(
    serviceId: string,
    field: "quantity" | "unitPrice" | "descriptionOverride",
    value: string,
  ) {
    setDraftItems((current) =>
      current.map((item) =>
        item.serviceId === serviceId ? { ...item, [field]: value } : item,
      ),
    );
  }
  function moveService(draggedId: string, targetId: string) {
    if (isReadOnly || saving || draggedId === targetId) return;
    setDraftItems((current) => {
      const fromIndex = current.findIndex((item) => item.serviceId === draggedId);
      const targetIndex = current.findIndex((item) => item.serviceId === targetId);
      if (fromIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [dragged] = next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
  }
  function addLead(leadId: string) {
    setLeadIds(leadId ? [leadId] : []);
  }
  function removeLead(leadId: string) {
    setLeadIds((current) => current.filter((id) => id !== leadId));
  }
  async function createQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReadOnly || loading || saving) return;
    setError("");
    if (!draftItems.length) return setError("Select at least one service.");
    if (leadIds.length > 1) return setError("Link this quotation to one lead only. Copy it for another customer.");
    setSaving(true);
    try {
      const payload = {
        validUntil: validUntil || null,
        notes: notes || null,
        leadIds,
        items: draftItems.map((item) => ({
          serviceId: item.serviceId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          descriptionOverride: item.descriptionOverride || null,
        })),
      };
      const response = await fetch(
        quotationId
          ? `/api/admin/quotations/${quotationId}`
          : "/api/admin/quotations",
        {
          method: quotationId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to create quotation.");
      if (quotationId) {
        router.push("/admin/quotations");
        return;
      }
      if (returnTo) { router.push(returnTo); return; }
      setQuotations((current) => [data.quotation, ...current]);
      setItems((current) => [...current, ...data.items]);
      setLinks((current) => [...current, ...data.links]);
      setDraftItems([]);
      setLeadIds([]);
      setValidUntil("");
      setNotes("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create quotation.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function updateStatus(quotationId: string, status: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/quotations/${quotationId}/lifecycle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: status }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to update quotation.");
      setQuotations((current) =>
        current.map((quotation) =>
          quotation.id === quotationId ? data.quotation : quotation,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update quotation.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function deleteQuotation() {
    if (!quotationToDelete) return;
    setDeletingQuotation(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/quotations/${quotationToDelete.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to delete quotation.");
      setQuotations((current) => current.filter((quotation) => quotation.id !== quotationToDelete.id));
      setItems((current) => current.filter((item) => item.quotation_id !== quotationToDelete.id));
      setLinks((current) => current.filter((link) => link.quotation_id !== quotationToDelete.id));
      const deletedId = quotationToDelete.id;
      setQuotationToDelete(null);
      if (quotationId === deletedId) {
        setIsHistoryOpen(false);
        router.replace("/admin/quotations");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete quotation.");
    } finally {
      setDeletingQuotation(false);
    }
  }
  return (
    <section className="min-w-0 rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{currentQuotation?.quotation_number || "Quotations"}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create quotations from celebration services and optionally link each
            quotation to one customer lead.
          </p>
        </div>
        {quotationId && <CopyQuotationButton key={quotationId} quotationId={quotationId} />}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      <form onSubmit={createQuotation} className="mt-5 border-t pt-5">
        <h3 className="text-sm font-semibold text-slate-800">{quotationId ? "Quotation details" : "New quotation"}</h3>
        {isReadOnly && (
          <p role="status" className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            This quotation is {currentQuotation.status} and cannot be edited. Create a new quotation to make changes.
          </p>
        )}
        {currentQuotation?.status === "draft" && leadIds.length === 0 && (
          <p className="mt-3 text-sm text-slate-600">Choose the customer lead and review the validity date and family notes before sending this draft.</p>
        )}
        <fieldset disabled={loading || saving || isReadOnly} className="min-w-0">
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">
            Loading service catalogue…
          </p>
        ) : (
          <div className="mt-3">
            <div aria-hidden="true" className="hidden gap-3 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:grid xl:grid-cols-[32px_minmax(0,1fr)_110px_80px_120px_80px]">
              <span />
              <span>Service</span>
              <span>Cost (₹)</span>
              <span>Quantity</span>
              <span>Total amount</span>
              <span />
            </div>
            <div className="grid grid-cols-2 items-end gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 xl:grid-cols-[32px_minmax(0,1fr)_110px_80px_120px_80px]">
              <span className="hidden xl:block" />
              <label className="col-span-2 min-w-0 text-xs text-slate-600 xl:col-span-1">
                <span className="mb-1 block xl:sr-only">Service</span>
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  className="h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-base xl:h-9 xl:text-sm"
                >
                  <option value="">Choose a service</option>
                  {services
                    .filter(
                      (service) =>
                        !draftItems.some(
                          (item) => item.serviceId === service.id,
                        ),
                    )
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="min-w-0 text-xs text-slate-600">
                <span className="mb-1 block xl:sr-only">Cost (₹)</span>
                <input
                  aria-label="Cost"
                  min="0"
                  step="0.01"
                  type="number"
                  value={selectedUnitPrice}
                  onChange={(event) => setSelectedUnitPrice(event.target.value)}
                  placeholder="0.00"
                  className="h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-base xl:h-9 xl:text-sm"
                />
              </label>
              <label className="min-w-0 text-xs text-slate-600">
                <span className="mb-1 block xl:sr-only">Quantity</span>
                <input
                  aria-label="Quantity"
                  min="1"
                  max="10000"
                  type="number"
                  value={selectedQuantity}
                  onChange={(event) => setSelectedQuantity(event.target.value)}
                  className="h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-base xl:h-9 xl:text-sm"
                />
              </label>
              <div className="min-w-0">
                <span className="mb-1 block text-xs text-slate-600 xl:sr-only">Total amount</span>
                <p className="flex min-h-11 items-center break-all rounded-md bg-white px-2 py-2 text-sm font-medium text-slate-900 xl:min-h-9">
                  {money.format(
                    (Number(selectedQuantity) || 0) *
                      (Number(selectedUnitPrice) || 0),
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full xl:h-9"
                disabled={
                  !selectedServiceId ||
                  !selectedQuantity ||
                  selectedUnitPrice === ""
                }
                onClick={addService}
              >
                Add
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {draftItems.map((item) => {
                const service = services.find(
                  (candidate) => candidate.id === item.serviceId,
                );
                if (!service) return null;
                const lineTotal =
                  (Number(item.quantity) || 0) *
                  (Number(item.unitPrice) || 0);
                return (
                  <div
                    key={service.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggedServiceId && draggedServiceId !== service.id) setDropTargetServiceId(service.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedServiceId) moveService(draggedServiceId, service.id);
                      setDraggedServiceId(null);
                      setDropTargetServiceId(null);
                    }}
                    className={`relative grid grid-cols-2 items-end gap-3 rounded-lg border p-3 transition-colors xl:grid-cols-[32px_minmax(0,1fr)_110px_80px_120px_80px] ${dropTargetServiceId === service.id ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}
                  >
                    <button
                      type="button"
                      draggable={!isReadOnly && !saving}
                      aria-label={`Drag ${service.name} to change its position`}
                      title="Drag to reorder"
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", service.id);
                        setDraggedServiceId(service.id);
                      }}
                      onDragEnd={() => {
                        setDraggedServiceId(null);
                        setDropTargetServiceId(null);
                      }}
                      className="absolute right-2 top-2 inline-flex h-11 w-8 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing xl:static xl:mb-1 xl:h-9"
                    >
                      <GripVertical aria-hidden="true" className="size-5" />
                    </button>
                    <div className="col-span-2 min-w-0 pr-8 xl:col-span-1 xl:pb-2 xl:pr-0">
                      <p className="break-words font-medium text-slate-900">
                        {service.name}
                      </p>
                      {service.show_description_in_quotation && <label className="mt-2 block text-xs text-slate-600">Quotation description (this quotation only)<textarea value={item.descriptionOverride} onChange={(event) => changeItem(service.id, "descriptionOverride", event.target.value)} maxLength={1000} rows={2} className="mt-1 w-full min-w-0 rounded-md border border-slate-300 p-2 text-base text-slate-700 xl:text-sm" /></label>}
                    </div>
                    <label className="min-w-0">
                      <span aria-hidden="true" className="mb-1 block text-xs text-slate-600 xl:hidden">Cost (₹)</span>
                      <span className="sr-only">Cost for {service.name}</span>
                      <input
                        required
                        min="0"
                        step="0.01"
                        type="number"
                        value={item.unitPrice}
                        onChange={(event) =>
                          changeItem(
                            service.id,
                            "unitPrice",
                            event.target.value,
                          )
                        }
                        className="h-11 w-full min-w-0 rounded-md border border-slate-300 px-2 text-base xl:h-9"
                      />
                    </label>
                    <label className="min-w-0">
                      <span aria-hidden="true" className="mb-1 block text-xs text-slate-600 xl:hidden">Quantity</span>
                      <span className="sr-only">
                        Quantity for {service.name}
                      </span>
                      <input
                        required
                        min="1"
                        max="10000"
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          changeItem(
                            service.id,
                            "quantity",
                            event.target.value,
                          )
                        }
                        className="h-11 w-full min-w-0 rounded-md border border-slate-300 px-2 text-base xl:h-9"
                      />
                    </label>
                    <div className="min-w-0">
                      <span className="mb-1 block text-xs text-slate-600 xl:sr-only">Total amount</span>
                      <p className="flex min-h-11 items-center break-all rounded-md bg-slate-50 px-2 py-2 text-sm font-medium text-slate-900 xl:min-h-9">
                        {money.format(lineTotal)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 w-full xl:h-9"
                      onClick={() => removeService(service.id)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
            {draftItems.length === 0 && (
              <p className="mt-3 text-sm text-slate-500">
                Add a service line to start this quotation.
              </p>
            )}
            {services.length === 0 && (
              <p className="mt-3 text-sm text-slate-500">
                No active celebration services are available.
              </p>
            )}
          </div>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Valid until
            <input
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2"
            />
          </label>
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            Quotation total{" "}
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {money.format(total)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm text-slate-700">
            Customer lead (optional)
            <select
              value=""
              onChange={(event) => {
                addLead(event.target.value);
                event.currentTarget.value = "";
              }}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2"
            >
              <option value="">Select an active lead</option>
              {leads
                .filter((lead) => !leadIds.includes(lead.id))
                .map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.contact_name} —{" "}
                    {lead.mobile || lead.email || "No contact"}
                  </option>
                ))}
            </select>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {leadIds.map((leadId) => {
              const lead = leads.find((candidate) => candidate.id === leadId);
              return lead ? (
                <Button
                  key={lead.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => removeLead(lead.id)}
                >
                  {lead.contact_name} ×
                </Button>
              ) : null;
            })}
          </div>
          <span className="mt-1 block text-xs text-slate-500">
            Select one lead. Choosing another replaces the selection. Use Copy quotation for another customer.
          </span>
          {leadIds.length > 1 && <p role="alert" className="mt-2 text-sm text-amber-800">This existing quotation has multiple leads. Keep one lead before saving, and copy the quotation for each additional customer.</p>}
        </div>
        <label className="mt-4 block text-sm text-slate-700">
          Notes for the family
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={2000}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button
            disabled={saving || loading || isReadOnly || !draftItems.length}
            type="submit"
          >
            {saving ? "Saving…" : quotationId ? "Save quotation" : "Create draft quotation"}
          </Button>
        </div>
        </fieldset>
      </form>
      {quotationId && <>
        <QuotationBookingAction quotationId={quotationId} status={quotations.find((candidate) => candidate.id === quotationId)?.status || ''} />
        <QuotationLifecycle quotationId={quotationId} quotation={currentQuotation || null} onQuotationChange={handleQuotationChange} />
        <section className="mt-6 border-t border-rose-200 pt-5">
          <h3 className="text-sm font-semibold text-rose-900">Delete quotation</h3>
          <p className="mt-1 text-sm text-rose-800">This permanently removes the quotation and its related history. Quotations linked to a booking cannot be deleted.</p>
          <Button
            type="button"
            className="mt-3"
            size="sm"
            variant="destructive"
            disabled={deletingQuotation || !quotations.some((quotation) => quotation.id === quotationId)}
            onClick={() => setQuotationToDelete(quotations.find((quotation) => quotation.id === quotationId) || null)}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete quotation
          </Button>
        </section>
      </>}
      <div className="mt-6 flex items-center justify-between border-t pt-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Quotation history
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            View previous quotations and their linked leads.
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="View quotation history"
          aria-label="View quotation history"
          onClick={() => setIsHistoryOpen(true)}
        >
          <History className="h-4 w-4" />
        </Button>
      </div>
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation history</DialogTitle>
            <DialogDescription>
              Previous quotations are shown for reference only.
            </DialogDescription>
          </DialogHeader>
          {!loading && quotations.length === 0 && (
            <p className="text-sm text-slate-500">
              No quotations have been created yet.
            </p>
          )}
          <div className="space-y-3">
            {quotations.map((quotation) => (
              <article
                key={quotation.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {quotation.quotation_number}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Created{" "}
                      {new Date(quotation.created_at).toLocaleDateString()}
                      {quotation.valid_until
                        ? ` · Valid until ${new Date(`${quotation.valid_until}T00:00:00`).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-slate-900">
                      {money.format(quotation.total_amount)}
                    </p>
                    <select
                      aria-label={`Status for ${quotation.quotation_number}`}
                      disabled={saving}
                      value={quotation.status}
                      onChange={(event) =>
                        void updateStatus(quotation.id, event.target.value)
                      }
                      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {title(status)}
                        </option>
                      ))}
                    </select>
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/admin/quotations/${quotation.id}/pdf`}>
                        Download PDF
                      </a>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deletingQuotation}
                      onClick={() => setQuotationToDelete(quotation)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                <ul className="mt-3 divide-y text-sm text-slate-700">
                  {items
                    .filter((item) => item.quotation_id === quotation.id)
                    .map((item) => {
                      const service = services.find((candidate) => candidate.id === item.celebration_service_id);
                      const description = service?.show_description_in_quotation ? item.description_override ?? service.description : null;
                      return <li key={item.id} className="flex justify-between gap-3 py-2">
                        <span>
                          <span className="block">{item.service_name} × {item.quantity}</span>
                          {description && <span className="mt-1 block text-xs text-slate-500">({description})</span>}
                        </span>
                        <span>{money.format(item.line_total)}</span>
                      </li>;
                    })}
                </ul>
                <p className="mt-4 text-sm text-slate-700">
                  <span className="font-medium">Customer lead:</span>{" "}
                  {links
                    .filter((link) => link.quotation_id === quotation.id)
                    .map(
                      (link) =>
                        leads.find((lead) => lead.id === link.lead_id)
                          ?.contact_name,
                    )
                    .filter(Boolean)
                    .join(", ") || "None"}
                </p>
                {quotation.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                    {quotation.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={quotationToDelete !== null} onOpenChange={(open) => !deletingQuotation && !open && setQuotationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {quotationToDelete?.quotation_number} and its service lines, linked leads, delivery records, and activity history. Quotations linked to a booking cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingQuotation}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deletingQuotation} onClick={() => void deleteQuotation()}>
              {deletingQuotation ? "Deleting…" : "Delete quotation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function QuotationLifecycle({ quotationId, quotation, onQuotationChange }: { quotationId: string; quotation: Quotation | null; onQuotationChange: (quotation: QuotationState) => void }) {
  const [activity, setActivity] = useState<Array<{ id: string; event_type: string; previous_status: string | null; new_status: string | null; created_at: string }>>([])
  const [deliveries, setDeliveries] = useState<Array<{ id: string; recipient_name: string; recipient_contact: string; channel: string; delivered_at: string }>>([])
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [action, setAction] = useState<string | null>(null); const [validUntil, setValidUntil] = useState(''); const [recipientName, setRecipientName] = useState(''); const [recipientContact, setRecipientContact] = useState(''); const [channel, setChannel] = useState('manual')
  const [actions, setActions] = useState<string[]>([]); const [effectiveStatus, setEffectiveStatus] = useState('')
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeDialog = () => { setAction(null); queueMicrotask(() => triggerRef.current?.focus()) }
  const load = useCallback(() => fetch(`/api/admin/quotations/${quotationId}/lifecycle`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setActivity(data.activity); setDeliveries(data.deliveries); setActions(data.allowedActions || []); setEffectiveStatus(data.effectiveStatus || data.quotation.status); onQuotationChange(data.quotation) }).catch(() => setError('Quotation activity could not be loaded.')), [quotationId, onQuotationChange])
  useEffect(() => { void load() }, [load])
  async function submit() { if (!action) return; if (action === 'delivery' && (!recipientName || !recipientContact)) return setError('Recipient name and contact are required.'); if (action === 'draft' && !validUntil) return setError('A renewed validity date is required.'); setSaving(true); setError(''); try { const response = await fetch(action === 'delivery' ? `/api/admin/quotations/${quotationId}/deliveries` : `/api/admin/quotations/${quotationId}/lifecycle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'delivery' ? { recipientName, recipientContact, channel, notes: null } : { toStatus: action, reopenValidUntil: action === 'draft' ? validUntil : null }) }); const data = await response.json().catch(() => ({})); if (!response.ok) { if (response.status === 409) await load(); throw new Error(data.error || `Unable to save lifecycle action (${response.status}).`) }; setAction(null); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save lifecycle action.') } finally { setSaving(false) } }
  if (!quotation) return null
  const actionLabel = (status: string) => {
    if (status === 'draft' && effectiveStatus === 'expired') return 'Reopen'
    if (status === 'accepted') return 'Approve'
    return title(status)
  }
  return <section className="mt-6 border-t pt-5"><h3 className="text-sm font-semibold text-slate-800">Lifecycle</h3><p className="mt-1 text-sm text-slate-600">Status: <strong>{title(effectiveStatus || quotation.status)}</strong></p>{error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}<div className="mt-3 flex flex-wrap gap-2">{actions.map(status => <Button key={status} ref={status === 'sent' || status === 'draft' ? triggerRef : undefined} type="button" size="sm" variant="outline" disabled={saving} onClick={(event) => { triggerRef.current = event.currentTarget; setAction(status) }}>{actionLabel(status)}</Button>)}<Button type="button" size="sm" variant="outline" disabled={saving} onClick={(event) => { triggerRef.current = event.currentTarget; setAction('delivery') }}>Record manual delivery</Button></div><div className="mt-4 space-y-2 text-sm text-slate-600">{activity.map((event) => <p key={event.id}>{new Date(event.created_at).toLocaleString()} — {title(event.event_type.replace('_', ' '))}</p>)}{deliveries.map((delivery) => <p key={delivery.id}>Manually recorded delivery to {delivery.recipient_name} ({delivery.recipient_contact})</p>)}</div><Dialog open={!!action} onOpenChange={(open) => !saving && !open && closeDialog()}><DialogContent><DialogHeader><DialogTitle>{action === 'delivery' ? 'Record manual delivery' : `${actionLabel(action || '')} ${quotation.quotation_number}`}</DialogTitle><DialogDescription>{action === 'delivery' ? 'This records a manual handoff; it does not send a message.' : 'Confirm this lifecycle change.'}</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{action === 'draft' && <label className="text-sm text-slate-700">Renewed validity date<input aria-label="Renewed validity date" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="mt-1 h-9 w-full rounded border px-2" /></label>}{action === 'delivery' && <div className="space-y-2"><input placeholder="Recipient name" value={recipientName} onChange={e=>setRecipientName(e.target.value)} className="h-9 w-full rounded border px-2"/><input placeholder="Recipient contact" value={recipientContact} onChange={e=>setRecipientContact(e.target.value)} className="h-9 w-full rounded border px-2"/><select value={channel} onChange={e=>setChannel(e.target.value)} className="h-9 rounded border px-2"><option value="manual">Manual</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></div>}<DialogFooter><Button variant="outline" disabled={saving} onClick={closeDialog}>Cancel</Button><Button disabled={saving} onClick={()=>void submit()}>{saving ? 'Saving…' : 'Confirm'}</Button></DialogFooter></DialogContent></Dialog></section>
}
