"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
type Vendor = {
  id: string;
  vendor_name: string;
  category: string;
  contact_person: string | null;
  mobile: string | null;
  email: string | null;
  location: string | null;
  address: string | null;
  description: string | null;
  internal_notes: string | null;
  is_active: boolean;
};
const blank = {
  vendorName: "",
  category: "",
  contactPerson: "",
  mobile: "",
  email: "",
  location: "",
  description: "",
  internalNotes: "",
  isActive: true,
};
const vendorsPerPage = 10;
export function VendorDirectory() {
  const [vendors, setVendors] = useState<Vendor[]>([]),
    [all, setAll] = useState<Vendor[]>([]),
    [search, setSearch] = useState(""),
    [active, setActive] = useState("true"),
    [category, setCategory] = useState(""),
    [contactPerson, setContactPerson] = useState(""),
    [mobile, setMobile] = useState(""),
    [page, setPage] = useState(1),
    [edit, setEdit] = useState<(typeof blank & { id?: string }) | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const load = async () => {
    const response = await fetch(
        `/api/admin/vendors?${new URLSearchParams({ search, category, contactPerson, mobile, active })}`,
      ),
      data = await response.json();
    if (!response.ok) throw Error(data.error);
    setVendors(data.vendors);
    if (!all.length)
      setAll(
        (await fetch("/api/admin/vendors?active=").then((x) => x.json()))
          .vendors || [],
      );
  };
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [search, active, category, contactPerson, mobile]);
  const categories = useMemo(
    () => [...new Set(all.map((x) => x.category))].sort(),
    [all],
  );
  const totalPages = Math.max(1, Math.ceil(vendors.length / vendorsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleVendors = vendors.slice(
    (currentPage - 1) * vendorsPerPage,
    currentPage * vendorsPerPage,
  );
  const updateFilters = (update: () => void) => {
    setPage(1);
    update();
  };
  const vendorPayload = (vendor: Vendor, isActive = vendor.is_active) => ({
    vendorName: vendor.vendor_name,
    category: vendor.category,
    contactPerson: vendor.contact_person,
    mobile: vendor.mobile,
    email: vendor.email,
    location: vendor.location,
    address: vendor.address,
    description: vendor.description,
    internalNotes: vendor.internal_notes,
    isActive,
  });
  const changeStatus = async (vendor: Vendor) => {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorPayload(vendor, !vendor.is_active)),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Unable to update vendor status");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update vendor status");
    } finally {
      setSaving(false);
    }
  };
  const removeVendor = async (vendor: Vendor) => {
    if (saving || !window.confirm(`Delete ${vendor.vendor_name}? This cannot be undone.`)) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Unable to delete vendor");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete vendor");
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    if (!edit || saving) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch(
          edit.id ? `/api/admin/vendors/${edit.id}` : "/api/admin/vendors",
          {
            method: edit.id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...edit, contactPerson: edit.contactPerson || null, mobile: edit.mobile || null, email: edit.email || null, location: edit.location || null, description: edit.description || null, internalNotes: edit.internalNotes || null }),
          },
        ),
        data = await response.json();
      if (!response.ok) {
        setError(data.error);
        return;
      }
      setEdit(null);
      setAll([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save vendor");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <Button
          onClick={() => {
            setError("");
            setEdit({ ...blank });
          }}
        >
          Add vendor
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="mt-5 grid gap-3 rounded-lg border bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="vendor-filter-name">Vendor name</Label>
          <Input id="vendor-filter-name" aria-label="Search vendors" value={search} onChange={(e) => updateFilters(() => setSearch(e.target.value))} placeholder="Filter by name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vendor-filter-category">Category</Label>
          <select id="vendor-filter-category" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" aria-label="Vendor category" value={category} onChange={(e) => updateFilters(() => setCategory(e.target.value))}>
            <option value="">All categories</option>
            {categories.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vendor-filter-contact">Contact person</Label>
          <Input id="vendor-filter-contact" aria-label="Contact person" value={contactPerson} onChange={(e) => updateFilters(() => setContactPerson(e.target.value))} placeholder="Filter by contact" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vendor-filter-mobile">Mobile number</Label>
          <Input id="vendor-filter-mobile" aria-label="Mobile number" value={mobile} onChange={(e) => updateFilters(() => setMobile(e.target.value))} placeholder="Filter by mobile" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vendor-filter-status">Status</Label>
          <select id="vendor-filter-status" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" aria-label="Vendor status" value={active} onChange={(e) => updateFilters(() => setActive(e.target.value))}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">All statuses</option>
          </select>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Vendor name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 font-semibold">Contact person</th>
                <th scope="col" className="px-4 py-3 font-semibold">Mobile number</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleVendors.length ? visibleVendors.map((x) => (
                <tr key={x.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{x.vendor_name}</td>
                  <td className="px-4 py-3">{x.category}</td>
                  <td className="px-4 py-3">{x.contact_person || "—"}</td>
                  <td className="px-4 py-3">{x.mobile || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={x.is_active ? "font-medium text-emerald-700" : "font-medium text-slate-600"}>{x.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEdit({
                            id: x.id,
                            vendorName: x.vendor_name,
                            category: x.category,
                            contactPerson: x.contact_person || "",
                            mobile: x.mobile || "",
                            email: x.email || "",
                            location: x.location || "",
                            description: x.description || "",
                            internalNotes: x.internal_notes || "",
                            isActive: x.is_active,
                          })
                        }
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => void changeStatus(x)}>
                        {x.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="destructive" disabled={saving} onClick={() => void removeVendor(x)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                    No vendors match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-600">
            <span>
              {vendors.length ? <>
              Showing {(currentPage - 1) * vendorsPerPage + 1}–{Math.min(currentPage * vendorsPerPage, vendors.length)} of {vendors.length} vendors
              </> : "No vendors found"}
            </span>
            {vendors.length > 0 && <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <span aria-live="polite">Page {currentPage} of {totalPages}</span>
              <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
            </div>}
          </div>
        </div>
      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit vendor" : "Add vendor"}</DialogTitle>
            <DialogDescription>
              Add the vendor&apos;s core contact details. Fields marked required
              are needed to save the vendor.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <>
              {error && <p role="alert">{error}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vendor-name">Vendor name *</Label>
                  <Input id="vendor-name" aria-label="vendorName" autoComplete="organization" required value={edit.vendorName} onChange={(e) => setEdit({ ...edit, vendorName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-category">Category *</Label>
                  <Input id="vendor-category" aria-label="category" required value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-contact">Contact person</Label>
                  <Input id="vendor-contact" aria-label="contactPerson" autoComplete="name" value={edit.contactPerson} onChange={(e) => setEdit({ ...edit, contactPerson: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-mobile">Mobile number</Label>
                  <Input id="vendor-mobile" aria-label="mobile" autoComplete="tel" inputMode="tel" value={edit.mobile} onChange={(e) => setEdit({ ...edit, mobile: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-email">Email address</Label>
                  <Input id="vendor-email" aria-label="email" autoComplete="email" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-location">Location</Label>
                  <Input id="vendor-location" aria-label="location" autoComplete="address-level2" value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-description">Service description</Label>
                <Textarea id="vendor-description" aria-label="description" placeholder="Services offered, availability, or other customer-facing details" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-notes">Internal notes</Label>
                <Textarea id="vendor-notes" aria-label="internal notes" placeholder="Private operational notes (not shown to customers)" value={edit.internalNotes} onChange={(e) => setEdit({ ...edit, internalNotes: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Input
                  className="h-4 w-4"
                  type="checkbox"
                  checked={edit.isActive}
                  onChange={(e) =>
                    setEdit({ ...edit, isActive: e.target.checked })
                  }
                />
                Active
              </label>
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
