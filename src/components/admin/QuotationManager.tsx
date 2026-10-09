"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Service = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};
type Quotation = {
  id: string;
  quotation_number: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
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
  quantity: number;
  unit_price: number;
  line_total: number;
};
type DraftItem = { serviceId: string; quantity: string; unitPrice: string };
type Lead = {
  id: string;
  contact_name: string;
  mobile: string | null;
  email: string | null;
};
type QuotationLead = { quotation_id: string; lead_id: string };

const statuses = ["draft", "sent", "accepted", "rejected", "expired"] as const;
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
          setDraftItems((context.enquiryServices || []).filter((service: { service_id: string }) => active.has(service.service_id)).map((service: { service_id: string }) => ({ serviceId: service.service_id, quantity: "1", unitPrice: "" })));
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
    field: "quantity" | "unitPrice",
    value: string,
  ) {
    setDraftItems((current) =>
      current.map((item) =>
        item.serviceId === serviceId ? { ...item, [field]: value } : item,
      ),
    );
  }
  function addLead(leadId: string) {
    if (leadId)
      setLeadIds((current) =>
        current.includes(leadId) ? current : [...current, leadId],
      );
  }
  function removeLead(leadId: string) {
    setLeadIds((current) => current.filter((id) => id !== leadId));
  }
  async function createQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!draftItems.length) return setError("Select at least one service.");
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
      const response = await fetch(`/api/admin/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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
  return (
    <section className="rounded-xl border bg-white p-5">
      <div>
        <h2 className="font-semibold text-slate-900">Quotations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Create quotations from celebration services and optionally link them
          to one or more leads.
        </p>
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
        <h3 className="text-sm font-semibold text-slate-800">New quotation</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">
            Loading service catalogue…
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[minmax(180px,1fr)_130px_100px_130px_100px] gap-3 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Service</span>
                <span>Cost (₹)</span>
                <span>Quantity</span>
                <span>Total amount</span>
                <span className="sr-only">Actions</span>
              </div>
              <div className="grid grid-cols-[minmax(180px,1fr)_130px_100px_130px_100px] items-end gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm"
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
                <input
                  aria-label="Cost"
                  min="0"
                  step="0.01"
                  type="number"
                  value={selectedUnitPrice}
                  onChange={(event) => setSelectedUnitPrice(event.target.value)}
                  placeholder="0.00"
                  className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
                />
                <input
                  aria-label="Quantity"
                  min="1"
                  max="10000"
                  type="number"
                  value={selectedQuantity}
                  onChange={(event) => setSelectedQuantity(event.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
                />
                <p className="h-9 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900">
                  {money.format(
                    (Number(selectedQuantity) || 0) *
                      (Number(selectedUnitPrice) || 0),
                  )}
                </p>
                <Button
                  type="button"
                  variant="outline"
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
                      className="grid grid-cols-[minmax(180px,1fr)_130px_100px_130px_100px] items-end gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <div className="pb-2">
                        <p className="font-medium text-slate-900">
                          {service.name}
                        </p>
                        {service.description && (
                          <p className="mt-1 text-xs text-slate-500">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <label>
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
                          className="h-9 w-full rounded-md border border-slate-300 px-2"
                        />
                      </label>
                      <label>
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
                          className="h-9 w-full rounded-md border border-slate-300 px-2"
                        />
                      </label>
                      <p className="h-9 rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                        {money.format(lineTotal)}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
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
            Link leads (optional)
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
            Select a lead from the dropdown. Selected leads can be removed with
            ×.
          </span>
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
            disabled={saving || loading || !draftItems.length}
            type="submit"
          >
            {saving ? "Saving…" : "Create draft quotation"}
          </Button>
        </div>
      </form>
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
                  </div>
                </div>
                <ul className="mt-3 divide-y text-sm text-slate-700">
                  {items
                    .filter((item) => item.quotation_id === quotation.id)
                    .map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-3 py-2"
                      >
                        <span>
                          {item.service_name} × {item.quantity}
                        </span>
                        <span>{money.format(item.line_total)}</span>
                      </li>
                    ))}
                </ul>
                <p className="mt-4 text-sm text-slate-700">
                  <span className="font-medium">Linked leads:</span>{" "}
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
    </section>
  );
}
