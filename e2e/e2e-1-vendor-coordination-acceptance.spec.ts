import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

type Fixture = {
  marker: string;
  enquiryId?: string;
  leadId?: string;
  quotationId?: string;
  bookingId?: string;
  serviceId?: string;
  vendorId?: string;
  adminId?: string;
};
const date = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const vars = (text: string) =>
  Object.fromEntries(
    text.split("\n").flatMap((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
      return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
    }),
  );
async function db(): Promise<SupabaseClient> {
  const value = vars(await readFile(".env.local", "utf8")),
    url = value.NEXT_PUBLIC_SUPABASE_URL,
    key = value.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url))
    throw new Error(
      "Refusing Scenario F setup without loopback local Supabase credentials",
    );
  const { stdout } = await promisify(execFile)("supabase", [
    "status",
    "--output",
    "json",
  ]);
  const status = JSON.parse(stdout) as {
    API_URL?: string;
    linked_project?: unknown;
  };
  if (
    !status.API_URL ||
    status.linked_project ||
    new URL(status.API_URL).origin !== new URL(url).origin
  )
    throw new Error(
      "Refusing Scenario F against an unverified local Supabase instance",
    );
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
async function fixture(): Promise<Fixture> {
  const value: Fixture = { marker: `SC-F-${crypto.randomUUID().slice(0, 8)}` },
    client = await db();
  const { data: admin } = await client
    .from("admins")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();
  expect(admin).toBeTruthy();
  value.adminId = admin!.id;
  const { data: enquiry, error: enquiryError } = await client
    .from("celebration_enquiries")
    .insert({
      location: "thirukadaiyur",
      celebration_type: "70th-marriage",
      husband_name: `${value.marker} Husband`,
      wife_name: `${value.marker} Wife`,
      husband_dob: "1950-01-01",
      wife_dob: "1952-02-02",
      preferred_date: date(90),
      alternative_date: date(91),
      guest_count_range: "20-50",
      arrangement_preference: "complete-arrangement",
      contact_name: value.marker,
      mobile: "9876543210",
      preferred_contact_method: "phone",
      notes: value.marker,
    })
    .select("id")
    .single();
  expect(enquiryError).toBeNull();
  value.enquiryId = enquiry!.id;
  const { data: lead, error: leadError } = await client
    .from("leads")
    .insert({
      celebration_enquiry_id: value.enquiryId,
      source: "website",
      status: "new",
      contact_name: value.marker,
      mobile: "9876543210",
      event_type: "70th-marriage",
      event_date: date(90),
    })
    .select("id")
    .single();
  expect(leadError).toBeNull();
  value.leadId = lead!.id;
  const { data: service } = await client
    .from("celebration_services")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();
  const { data: quotationId, error } = await client.rpc(
    "create_admin_quotation",
    {
      p_quotation_number: `${value.marker}-Q`,
      p_valid_until: date(14),
      p_notes: value.marker,
      p_created_by: value.adminId,
      p_items: [{ service_id: service!.id, quantity: 1, unit_price: 12500 }],
      p_lead_ids: [value.leadId],
    },
  );
  expect(error).toBeNull();
  value.quotationId = quotationId as string;
  expect(
    (
      await client.rpc("transition_admin_quotation", {
        p_quotation_id: value.quotationId,
        p_to_status: "sent",
        p_admin_id: value.adminId,
        p_reopen_valid_until: null,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await client.rpc("transition_admin_quotation", {
        p_quotation_id: value.quotationId,
        p_to_status: "accepted",
        p_admin_id: value.adminId,
        p_reopen_valid_until: null,
      })
    ).error,
  ).toBeNull();
  const { data: bookingId, error: bookingError } = await client.rpc(
    "create_admin_booking",
    { p_quotation_id: value.quotationId, p_admin_id: value.adminId },
  );
  expect(bookingError).toBeNull();
  value.bookingId = bookingId as string;
  expect(
    (
      await client.rpc("transition_admin_booking", {
        p_booking_id: value.bookingId,
        p_to_status: "confirmed",
        p_admin_id: value.adminId,
        p_cancellation_reason: null,
      })
    ).error,
  ).toBeNull();
  const { data: bookingService } = await client
    .from("celebration_booking_services")
    .select("id")
    .eq("booking_id", value.bookingId)
    .single();
  value.serviceId = bookingService!.id;
  return value;
}
async function clean(value: Fixture) {
  const client = await db();
  if (value.quotationId) {
    expect(
      (
        await client
          .from("celebration_bookings")
          .delete()
          .eq("quotation_id", value.quotationId)
      ).error,
    ).toBeNull();
    expect(
      (await client.from("quotations").delete().eq("id", value.quotationId))
        .error,
    ).toBeNull();
  }
  if (value.vendorId)
    expect(
      (await client.from("event_vendors").delete().eq("id", value.vendorId))
        .error,
    ).toBeNull();
  if (value.leadId)
    expect(
      (await client.from("leads").delete().eq("id", value.leadId)).error,
    ).toBeNull();
  if (value.enquiryId)
    expect(
      (
        await client
          .from("celebration_enquiries")
          .delete()
          .eq("id", value.enquiryId)
      ).error,
    ).toBeNull();
  const count = await client
    .from("event_vendors")
    .select("*", { count: "exact", head: true })
    .ilike("vendor_name", `%${value.marker}%`);
  expect(count.count).toBe(0);
}
async function login(page: Page) {
  const admin = JSON.parse(
    await readFile(".playwright/local-admin.json", "utf8"),
  ) as { email: string; password: string };
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in as Admin" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}
const coordination = (page: Page) =>
  page
    .getByRole("heading", { name: "Vendor coordination" })
    .locator("xpath=ancestor::section");
async function makeVendor(page: Page, value: Fixture) {
  await page.goto("/admin/vendors");
  await page.getByRole("button", { name: "Add vendor" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Please check");
  await dialog.getByLabel("vendorName").fill(`${value.marker} Caterers`);
  await dialog.getByLabel("category").fill("catering");
  await dialog.getByLabel("contactPerson").fill("Vendor Contact");
  await dialog.getByLabel("mobile").fill("9876543211");
  const create = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/admin/vendors") && r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Save" }).click();
  expect((await create).status()).toBe(201);
  await expect(
    page.getByText(`${value.marker} Caterers`, { exact: true }),
  ).toBeVisible();
  const client = await db();
  const { data } = await client
    .from("event_vendors")
    .select("id")
    .eq("vendor_name", `${value.marker} Caterers`)
    .single();
  value.vendorId = data!.id;
}
async function createAssignment(page: Page, value: Fixture, cost = "6400") {
  await page.goto(`/admin/bookings/${value.bookingId}`);
  const section = coordination(page);
  await section.getByRole("button", { name: "Create assignment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Vendor").selectOption(value.vendorId!);
  await dialog.getByLabel("Booking service").selectOption(value.serviceId!);
  await dialog.getByLabel("Agreed cost").fill(cost);
  await dialog.getByLabel("Scheduled date").fill(date(30));
  await dialog.getByLabel("Requirements").fill("Vegetarian service");
  await dialog.getByLabel("Internal notes").fill("Internal only");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/bookings/${value.bookingId}/vendors`) &&
      r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Create assignment" }).click();
  expect((await response).status()).toBe(201);
  await expect(
    section.getByText(`${value.marker} Caterers`, { exact: false }),
  ).toBeVisible();
}

test("Scenario F browser: catalogue, assignment, audit lifecycle and financial isolation", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const value = await fixture();
  try {
    await login(page);
    await makeVendor(page, value);
    const client = await db();
    await page.getByLabel("Search vendors").fill(value.marker);
    await expect(
      page.getByText(`${value.marker} Caterers`, { exact: true }),
    ).toBeVisible();
    const filtered = page.waitForResponse(
      (r) =>
        r.url().includes("/api/admin/vendors?") &&
        r.url().includes("category=catering"),
    );
    await page.getByLabel("Vendor category").selectOption("catering");
    expect((await filtered).status()).toBe(200);
    const before = await client
      .from("celebration_booking_services")
      .select("total_price_snapshot")
      .eq("id", value.serviceId)
      .single();
    const ledgerBefore = await client
      .from("customer_payment_ledger")
      .select("id")
      .eq("booking_id", value.bookingId);
    await createAssignment(page, value);
    const assignment = await client
      .from("event_vendor_assignments")
      .select("*")
      .eq("booking_id", value.bookingId)
      .single();
    expect(assignment.data).toMatchObject({
      vendor_id: value.vendorId,
      booking_service_id: value.serviceId,
      agreed_cost: 6400,
      status: "pending",
    });
    expect(
      (
        await client
          .from("celebration_booking_services")
          .select("total_price_snapshot")
          .eq("id", value.serviceId)
          .single()
      ).data,
    ).toEqual(before.data);
    expect(
      (
        await client
          .from("customer_payment_ledger")
          .select("id")
          .eq("booking_id", value.bookingId)
      ).data,
    ).toEqual(ledgerBefore.data);
    const row = coordination(page)
      .getByText(`${value.marker} Caterers`, { exact: false })
      .locator("xpath=..");
    await row.getByRole("button", { name: "Edit" }).click();
    const edit = page.getByRole("dialog");
    await expect(edit.getByText(`${value.marker} Caterers`)).toBeVisible();
    await edit.getByLabel("Agreed cost").fill("7200");
    await edit.getByLabel("Requirements").fill("Updated dietary requirements");
    const update = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/vendors/${assignment.data!.id}`) &&
        r.request().method() === "PATCH",
    );
    await edit.getByRole("button", { name: "Save" }).click();
    expect((await update).status()).toBe(200);
    const changed = await client
      .from("event_vendor_assignments")
      .select("agreed_cost,lock_version,requirements")
      .eq("id", assignment.data!.id)
      .single();
    expect(changed.data).toMatchObject({
      agreed_cost: 7200,
      lock_version: 2,
      requirements: "Updated dietary requirements",
    });
    await coordination(page).getByRole("button", { name: "History" }).click();
    await expect(page.getByRole("dialog")).toContainText("updated");
    await page.keyboard.press("Escape");
    await row.getByRole("button", { name: "confirmed" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm confirmed" })
      .click();
    await expect(row).toContainText("confirmed");
    await expect(row.getByRole("button", { name: "Cancel" })).toBeVisible();
    const activities = await client
      .from("event_vendor_assignment_activities")
      .select("event_type,actor_id")
      .eq("assignment_id", assignment.data!.id);
    expect(activities.data?.map((x) => x.event_type)).toEqual([
      "created",
      "updated",
      "confirmed",
    ]);
    expect(activities.data?.every((x) => Boolean(x.actor_id))).toBeTruthy();
    await coordination(page).getByRole("button", { name: "History" }).click();
    await expect(page.getByRole("dialog")).toContainText("Playwright Local Admin");
    await page.keyboard.press("Escape");
    const invalid = await page.request.post(
      `/api/admin/bookings/${value.bookingId}/vendors/${assignment.data!.id}/lifecycle`,
      { data: { toStatus: "declined", lockVersion: 3 } },
    );
    expect(invalid.status()).toBe(400);
    const deactivate = await page.request.patch(
      `/api/admin/vendors/${value.vendorId}`,
      {
        data: {
          vendorName: `${value.marker} Caterers`,
          category: "catering",
          contactPerson: "Vendor Contact",
          mobile: "9876543211",
          email: null,
          location: null,
          description: "updated",
          internalNotes: "updated",
          isActive: false,
        },
      },
    );
    expect(deactivate.status()).toBe(200);
    await page.reload();
    await expect(
      coordination(page).getByText(`${value.marker} Caterers`, {
        exact: false,
      }),
    ).toBeVisible();
    const inactive = await page.request.post(
      `/api/admin/bookings/${value.bookingId}/vendors`,
      {
        data: {
          vendorId: value.vendorId,
          bookingServiceId: value.serviceId,
          agreedCost: 1,
        },
      },
    );
    expect(inactive.status()).toBe(409);
    const anonymous = await request.get("/api/admin/vendors");
    expect(anonymous.status()).toBe(401);
  } finally {
    await clean(value);
  }
});

test("Scenario F browser: stale edit, failures, ownership, and no duplicate writes", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const value = await fixture();
  let otherContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    await login(page);
    await makeVendor(page, value);
    await createAssignment(page, value);
    const client = await db();
    const assignment = await client
      .from("event_vendor_assignments")
      .select("id,lock_version")
      .eq("booking_id", value.bookingId)
      .single();
    otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await login(other);
    await page.goto(`/admin/bookings/${value.bookingId}`);
    await other.goto(`/admin/bookings/${value.bookingId}`);
    const first = coordination(page)
        .getByText(`${value.marker} Caterers`, { exact: false })
        .locator("xpath=.."),
      second = coordination(other)
        .getByText(`${value.marker} Caterers`, { exact: false })
        .locator("xpath=..");
    await first.getByRole("button", { name: "Edit" }).click();
    await second.getByRole("button", { name: "Edit" }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Internal notes")
      .fill("Context A");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save" })
      .click();
    await other
      .getByRole("dialog")
      .getByLabel("Internal notes")
      .fill("Context B stale");
    const stale = other.waitForResponse(
      (r) =>
        r.url().endsWith(`/vendors/${assignment.data!.id}`) &&
        r.request().method() === "PATCH",
    );
    await other
      .getByRole("dialog")
      .getByRole("button", { name: "Save" })
      .click();
    expect((await stale).status()).toBe(409);
    await expect(other.getByRole("dialog").getByRole("alert")).toContainText(
      "updated by another administrator",
    );
    expect(
      (
        await client
          .from("event_vendor_assignments")
          .select("internal_notes,lock_version")
          .eq("id", assignment.data!.id)
          .single()
      ).data,
    ).toMatchObject({ internal_notes: "Context A", lock_version: 2 });
    expect(
      (
        await client
          .from("event_vendor_assignment_activities")
          .select("id")
          .eq("assignment_id", assignment.data!.id)
      ).data,
    ).toHaveLength(2);
    const serviceBad = await page.request.post(
      `/api/admin/bookings/${value.bookingId}/vendors`,
      {
        data: {
          vendorId: value.vendorId,
          bookingServiceId: "00000000-0000-0000-0000-000000000000",
        },
      },
    );
    expect(serviceBad.status()).toBe(409);
    const assignmentBad = await page.request.patch(
      `/api/admin/bookings/00000000-0000-0000-0000-000000000000/vendors/${assignment.data!.id}`,
      { data: { agreedCost: 1, lockVersion: 2 } },
    );
    expect(assignmentBad.status()).toBe(404);
    await other.getByRole("dialog").press("Escape");
    await expect(other.getByRole("dialog")).toBeHidden();
    await first.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog");
    const endpoint = (url: URL) =>
      url.pathname.endsWith(`/vendors/${assignment.data!.id}`);
    await page.route(endpoint, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Synthetic 500" }),
      }),
    );
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Synthetic 500");
    await page.unroute(endpoint);
    await page.route(endpoint, (route) => route.abort("failed"));
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Failed to fetch");
    await page.unroute(endpoint);
    await dialog.getByLabel("Internal notes").fill("Recovered");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    expect(
      (
        await client
          .from("event_vendor_assignments")
          .select("internal_notes")
          .eq("id", assignment.data!.id)
          .single()
      ).data?.internal_notes,
    ).toBe("Recovered");
  } finally {
    await otherContext?.close();
    await clean(value);
  }
});
