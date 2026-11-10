"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDialogContent } from "@/components/admin/BookingDialog";
import { formatBookingDate } from "@/lib/utils";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Vendor = { id: string; vendor_name: string; category: string };
type Service = { id: string; service_name_snapshot: string };
type Assignment = {
  id: string;
  status: string;
  agreed_cost: number | null;
  scheduled_date: string | null;
  requirements: string | null;
  internal_notes: string | null;
  lock_version: number;
  event_vendors: { vendor_name: string } | null;
  celebration_booking_services: { service_name_snapshot: string } | null;
};
type History = {
  id: string;
  event_type: string;
  actorName: string;
  created_at: string;
  metadata: unknown;
};
type Draft = {
  vendorId: string;
  bookingServiceId: string;
  agreedCost: string;
  scheduledDate: string;
  requirements: string;
  internalNotes: string;
};
const emptyDraft: Draft = {
  vendorId: "",
  bookingServiceId: "",
  agreedCost: "",
  scheduledDate: "",
  requirements: "",
  internalNotes: "",
};
const inputClass = "mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";
const textareaClass = "mt-1.5 w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900";
const title = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
async function body(response: Response) {
  const value: Record<string, any> = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(value.error || `Request failed (${response.status})`);
  return value;
}

export function VendorCoordination({ bookingId }: { bookingId: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]),
    [vendors, setVendors] = useState<Vendor[]>([]),
    [services, setServices] = useState<Service[]>([]);
  const [creating, setCreating] = useState(false),
    [draft, setDraft] = useState<Draft>(emptyDraft),
    [edit, setEdit] = useState<Assignment | null>(null),
    [action, setAction] = useState<{ a: Assignment; to: string } | null>(null),
    [history, setHistory] = useState<History[] | null>(null);
  const [error, setError] = useState(""),
    [dialogError, setDialogError] = useState(""),
    [saving, setSaving] = useState(false);
  const load = async () =>
    setAssignments(
      (await body(await fetch(`/api/admin/bookings/${bookingId}/vendors`)))
        .assignments,
    );
  const choices = async () => {
    const [vendorData, bookingData] = await Promise.all([
      body(await fetch("/api/admin/vendors?active=true")),
      body(await fetch(`/api/admin/bookings/${bookingId}`)),
    ]);
    setVendors(vendorData.vendors);
    setServices(bookingData.services);
  };
  useEffect(() => {
    void Promise.all([load(), choices()]).catch((e) => setError(e.message));
  }, [bookingId]);
  const close = () => {
    setDialogError("");
    setSaving(false);
  };
  const refreshHistory = async () => {
    try {
      setHistory(
        (
          await body(
            await fetch(`/api/admin/bookings/${bookingId}/vendor-activities`),
          )
        ).activities,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load history");
    }
  };
  const create = async () => {
    if (saving) return;
    setDialogError("");
    if (!draft.vendorId || !draft.bookingServiceId) {
      setDialogError("Select both a vendor and a booking service.");
      return;
    }
    const agreedCost =
      draft.agreedCost === "" ? null : Number(draft.agreedCost);
    if (
      agreedCost !== null &&
      (!Number.isFinite(agreedCost) || agreedCost < 0)
    ) {
      setDialogError("Cost must be non-negative.");
      return;
    }
    setSaving(true);
    try {
      await body(
        await fetch(`/api/admin/bookings/${bookingId}/vendors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId: draft.vendorId,
            bookingServiceId: draft.bookingServiceId,
            agreedCost,
            scheduledDate: draft.scheduledDate || null,
            requirements: draft.requirements || null,
            internalNotes: draft.internalNotes || null,
          }),
        }),
      );
      setCreating(false);
      setDraft(emptyDraft);
      await load();
    } catch (e) {
      setDialogError(
        e instanceof Error ? e.message : "Unable to create assignment",
      );
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    if (!edit || saving) return;
    setDialogError("");
    if (
      edit.agreed_cost !== null &&
      (!Number.isFinite(Number(edit.agreed_cost)) ||
        Number(edit.agreed_cost) < 0)
    ) {
      setDialogError("Cost must be non-negative.");
      return;
    }
    setSaving(true);
    try {
      await body(
        await fetch(`/api/admin/bookings/${bookingId}/vendors/${edit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agreedCost: edit.agreed_cost,
            scheduledDate: edit.scheduled_date,
            requirements: edit.requirements,
            internalNotes: edit.internal_notes,
            lockVersion: edit.lock_version,
          }),
        }),
      );
      setEdit(null);
      await load();
      if (history) await refreshHistory();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Unable to update assignment";
      setDialogError(message);
      if (message.includes("updated by another administrator")) void load();
    } finally {
      setSaving(false);
    }
  };
  const transition = async () => {
    if (!action || saving) return;
    setDialogError("");
    setSaving(true);
    try {
      await body(
        await fetch(
          `/api/admin/bookings/${bookingId}/vendors/${action.a.id}/lifecycle`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toStatus: action.to,
              lockVersion: action.a.lock_version,
            }),
          },
        ),
      );
      setAction(null);
      await load();
      if (history) await refreshHistory();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Unable to update assignment";
      setDialogError(message);
      if (message.includes("updated by another administrator")) void load();
    } finally {
      setSaving(false);
    }
  };
  const display = (metadata: any) =>
    metadata?.from || metadata?.to
      ? `Previous: ${JSON.stringify(metadata.from || {})} Updated: ${JSON.stringify(metadata.to || {})}`
      : metadata
        ? JSON.stringify(metadata)
        : "No additional details";
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Vendor Coordination</h2>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            size="sm"
            onClick={() => {
              setDialogError("");
              setCreating(true);
            }}
          >
            Create assignment
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refreshHistory()}
          >
            History
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      <div className="divide-y">
        {assignments.map((x) => (
          <div className="py-3" key={x.id}>
            <b>{x.celebration_booking_services?.service_name_snapshot}</b> —{" "}
            {x.event_vendors?.vendor_name || "Former vendor"} · {title(x.status)}
            <p>
              ₹{x.agreed_cost ?? "—"} · {x.scheduled_date ? formatBookingDate(x.scheduled_date) : "No date"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">{x.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDialogError("");
                  setEdit({ ...x });
                }}
              >
                Edit
              </Button>
            )}
            {x.status === "pending" &&
              ["confirmed", "declined", "cancelled"].map((to) => (
                <Button
                  key={to}
                  size="sm"
                  onClick={() => {
                    setDialogError("");
                    setAction({ a: x, to });
                  }}
                >
                  {title(to)}
                </Button>
              ))}
            {x.status === "confirmed" && (
              <Button
                size="sm"
                onClick={() => {
                  setDialogError("");
                  setAction({ a: x, to: "cancelled" });
                }}
              >
                Cancel
              </Button>
            )}</div>
          </div>
        ))}
      </div>
      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            close();
          }
        }}
      >
        <BookingDialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Vendor Assignment</DialogTitle><DialogDescription>Link a vendor to one of this booking&apos;s services.</DialogDescription></DialogHeader>
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void create(); }}>
            {dialogError && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{dialogError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Vendor<select aria-label="Vendor" className={inputClass} value={draft.vendorId} onChange={(e) => setDraft({ ...draft, vendorId: e.target.value })}><option value="">Select vendor</option>{vendors.map((v) => <option value={v.id} key={v.id}>{v.vendor_name} — {v.category}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Booking Service<select aria-label="Booking service" className={inputClass} value={draft.bookingServiceId} onChange={(e) => setDraft({ ...draft, bookingServiceId: e.target.value })}><option value="">Select booking service</option>{services.map((s) => <option value={s.id} key={s.id}>{s.service_name_snapshot}</option>)}</select></label>
            </div>
            <Fields value={draft} setValue={setDraft} />
            <DialogFooter className="gap-2 sm:space-x-0"><Button type="button" variant="outline" disabled={saving} onClick={() => { setCreating(false); close(); }}>Cancel</Button><Button disabled={saving} type="submit">{saving ? "Creating…" : "Create assignment"}</Button></DialogFooter>
          </form>
        </BookingDialogContent>
      </Dialog>
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open) {
            setEdit(null);
            close();
          }
        }}
      >
        <BookingDialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          {edit && (
            <>
              <p>
                {edit.event_vendors?.vendor_name} —{" "}
                {edit.celebration_booking_services?.service_name_snapshot}
              </p>
              {dialogError && <p role="alert">{dialogError}</p>}
              <input
                aria-label="Agreed cost"
                type="number"
                min="0"
                value={edit.agreed_cost ?? ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    agreed_cost:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <input
                aria-label="Scheduled date"
                type="date"
                value={edit.scheduled_date || ""}
                onChange={(e) =>
                  setEdit({ ...edit, scheduled_date: e.target.value || null })
                }
              />
              <textarea
                aria-label="Requirements"
                value={edit.requirements || ""}
                onChange={(e) =>
                  setEdit({ ...edit, requirements: e.target.value || null })
                }
              />
              <textarea
                aria-label="Internal notes"
                value={edit.internal_notes || ""}
                onChange={(e) =>
                  setEdit({ ...edit, internal_notes: e.target.value || null })
                }
              />
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </BookingDialogContent>
      </Dialog>
      <Dialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            close();
          }
        }}
      >
        <BookingDialogContent>
          <DialogHeader>
            <DialogTitle>{title(action?.to || "")} Vendor Assignment</DialogTitle>
          </DialogHeader>
          {action && (
            <>
              <p>
                {action.a.event_vendors?.vendor_name} for{" "}
                {action.a.celebration_booking_services?.service_name_snapshot}
              </p>
              <p>This updates only internal coordination status.</p>
              {dialogError && <p role="alert">{dialogError}</p>}
              <Button disabled={saving} onClick={() => void transition()}>
                {saving ? "Saving…" : `Confirm ${title(action.to)}`}
              </Button>
            </>
          )}
        </BookingDialogContent>
      </Dialog>
      <Dialog
        open={history !== null}
        onOpenChange={(open) => !open && setHistory(null)}
      >
        <BookingDialogContent>
          <DialogHeader>
            <DialogTitle>Coordination History</DialogTitle>
          </DialogHeader>
          {history?.map((x) => (
            <article key={x.id}>
              <b>{title(x.event_type)}</b> — {x.actorName} —{" "}
              {formatBookingDate(x.created_at)}
              <p>{display(x.metadata)}</p>
            </article>
          ))}
        </BookingDialogContent>
      </Dialog>
    </section>
  );
}
function Fields({
  value,
  setValue,
}: {
  value: Draft;
  setValue: (value: Draft) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Agreed Cost (₹)<input aria-label="Agreed cost" className={inputClass} type="number" min="0" value={value.agreedCost} onChange={(e) => setValue({ ...value, agreedCost: e.target.value })} /></label>
        <label className="text-sm font-medium text-slate-700">Scheduled Date<input aria-label="Scheduled date" className={inputClass} type="date" value={value.scheduledDate} onChange={(e) => setValue({ ...value, scheduledDate: e.target.value })} /></label>
      </div>
      <label className="block text-sm font-medium text-slate-700">Requirements<textarea aria-label="Requirements" className={textareaClass} rows={3} value={value.requirements} onChange={(e) => setValue({ ...value, requirements: e.target.value })} /></label>
      <label className="block text-sm font-medium text-slate-700">Internal Notes<textarea aria-label="Internal notes" className={textareaClass} rows={3} value={value.internalNotes} onChange={(e) => setValue({ ...value, internalNotes: e.target.value })} /></label>
    </div>
  );
}
