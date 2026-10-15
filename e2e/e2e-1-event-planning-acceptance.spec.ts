import { expect, test, type Page, type Route } from "@playwright/test";
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
  adminId?: string;
};
const date = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const env = (text: string) =>
  Object.fromEntries(
    text.split("\n").flatMap((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
      return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
    }),
  );
async function db(): Promise<SupabaseClient> {
  const values = env(await readFile(".env.local", "utf8")),
    url = values.NEXT_PUBLIC_SUPABASE_URL,
    key = values.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url))
    throw new Error(
      "Refusing Scenario E setup without loopback local Supabase credentials",
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
      "Refusing Scenario E setup against an unverified local Supabase instance",
    );
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
async function fixture(): Promise<Fixture> {
  const value: Fixture = { marker: `SC-E-${crypto.randomUUID().slice(0, 8)}` },
    client = await db();
  const { data: admins } = await client
    .from("admins")
    .select("id")
    .eq("is_active", true)
    .limit(1);
  expect(admins).toHaveLength(1);
  value.adminId = admins![0].id;
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
  const { data: services } = await client
    .from("celebration_services")
    .select("id")
    .eq("is_active", true)
    .limit(1);
  expect(services).toHaveLength(1);
  const { data: quotationId, error } = await client.rpc(
    "create_admin_quotation",
    {
      p_quotation_number: `${value.marker}-Q`,
      p_valid_until: date(14),
      p_notes: value.marker,
      p_created_by: value.adminId,
      p_items: [
        { service_id: services![0].id, quantity: 1, unit_price: 12500 },
      ],
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
  const counts = await Promise.all([
    client
      .from("celebration_enquiries")
      .select("*", { count: "exact", head: true })
      .eq("notes", value.marker),
    client
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("contact_name", value.marker),
    client
      .from("quotations")
      .select("*", { count: "exact", head: true })
      .eq("notes", value.marker),
  ]);
  expect(counts.map((x) => x.count)).toEqual([0, 0, 0]);
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
async function booking(page: Page, value: Fixture) {
  await page.goto(`/admin/quotations/${value.quotationId}/edit`);
  await page.getByRole("button", { name: "Create booking" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm" })
    .click();
  await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]+$/);
  value.bookingId = page.url().split("/").pop()!;
  const response = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/admin/bookings/${value.bookingId}/lifecycle`) &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Confirmed", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
}
const taskUrl = (id: string) => (url: URL) =>
  url.pathname === `/api/admin/bookings/${id}/tasks`;
async function createTask(
  page: Page,
  bookingId: string,
  title: string,
  extra: Record<string, unknown> = {},
) {
  const response = await page.request.post(
    `/api/admin/bookings/${bookingId}/tasks`,
    {
      data: {
        title,
        category: "general_administration",
        priority: "medium",
        ...extra,
      },
    },
  );
  expect(response.status()).toBe(201);
  return (await response.json()).taskId as string;
}
const taskRow = (page: Page, title: string) =>
  page.getByText(title, { exact: false }).locator("xpath=ancestor::div[1]");
async function currentIstDate(offset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.filter((x) => x.type !== "literal").map((x) => [x.type, x.value]),
  );
  const result = new Date(
    `${value.year}-${value.month}-${value.day}T12:00:00Z`,
  );
  result.setUTCDate(result.getUTCDate() + offset);
  return result.toISOString().slice(0, 10);
}

test("Scenario E manages a generated checklist and booking task through the authenticated UI", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const value = await fixture();
  try {
    await login(page);
    await booking(page, value);
    const client = await db();
    const { data: detail } = await client
      .from("celebration_bookings")
      .select("status, celebration_booking_services(*)")
      .eq("id", value.bookingId)
      .single();
    expect(detail?.status).toBe("confirmed");
    expect(detail?.celebration_booking_services).toHaveLength(1);
    expect(
      (
        await client
          .from("celebration_booking_activities")
          .select("id")
          .eq("booking_id", value.bookingId)
      ).data,
    ).not.toHaveLength(0);
    const planning = page
      .getByRole("heading", { name: "Event planning" })
      .locator("xpath=ancestor::section");
    await planning.getByRole("button", { name: "Select all" }).click();
    await planning.getByRole("button", { name: "Generate selected" }).click();
    await expect(
      planning.getByText("(generated)", { exact: false }).first(),
    ).toBeVisible();
    const generated = await client
      .from("event_tasks")
      .select("id,template_id,booking_id")
      .eq("booking_id", value.bookingId);
    expect(generated.data?.length).toBeGreaterThan(0);
    expect(
      generated.data?.every(
        (task) => task.booking_id === value.bookingId && task.template_id,
      ),
    ).toBe(true);
    const duplicate = await page.request.post(
      `/api/admin/bookings/${value.bookingId}/generate-checklist`,
      {
        data: { templateIds: generated.data!.map((task) => task.template_id) },
      },
    );
    expect(duplicate.status()).toBe(409);
    const trigger = planning.getByRole("button", { name: "Create task" });
    await trigger.focus();
    await trigger.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Create task" }).click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Task title is required",
    );
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog.getByLabel("Task title").fill(`${value.marker} manual task`);
    await dialog.getByLabel("Description").fill("UI-created task");
    await dialog.getByLabel("Category").selectOption("decoration");
    await dialog.getByLabel("Priority").selectOption("urgent");
    await dialog
      .getByLabel("Linked booking service")
      .selectOption({ index: 1 });
    await dialog
      .getByLabel("Assigned administrator")
      .selectOption({ index: 1 });
    await dialog.getByLabel("Due date").fill(date(2));
    await dialog.getByRole("button", { name: "Create task" }).click();
    await expect(dialog).toBeHidden();
    const task = await client
      .from("event_tasks")
      .select("*")
      .eq("booking_id", value.bookingId)
      .eq("title", `${value.marker} manual task`)
      .single();
    expect(task.data).toMatchObject({
      category: "decoration",
      priority: "urgent",
      due_date: date(2),
    });
    await expect(
      planning.getByText(value.marker, { exact: false }),
    ).toBeVisible();
    const row = taskRow(page, `${value.marker} manual task`);
    await row.getByRole("button", { name: "Edit" }).click();
    await dialog.getByLabel("Task title").fill(`${value.marker} edited`);
    await dialog.getByLabel("Description").fill("Edited UI task");
    await dialog.getByLabel("Priority").selectOption("high");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    const start = taskRow(page, `${value.marker} edited`);
    await start.getByRole("button", { name: "Start" }).click();
    await expect(start.getByRole("button", { name: "Complete" })).toBeVisible();
    await start.getByRole("button", { name: "Complete" }).click();
    await expect(start.getByRole("button", { name: "Reopen" })).toBeVisible();
    await start.getByRole("button", { name: "Activity" }).click();
    await expect(dialog.getByText("completed", { exact: false })).toBeVisible();
    await page.keyboard.press("Escape");
    const activities = await client
      .from("event_task_activities")
      .select("event_type,actor_id")
      .eq("task_id", task.data!.id);
    expect(activities.data?.map((x) => x.event_type)).toEqual(
      expect.arrayContaining([
        "created",
        "updated",
        "status_changed",
        "completed",
      ]),
    );
    expect(activities.data?.every((x) => x.actor_id)).toBe(true);
  } finally {
    await clean(value);
  }
});

test("Scenario E applies booking task filters on the server using Asia/Kolkata business dates", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const value = await fixture();
  try {
    await login(page);
    await booking(page, value);
    const today = await currentIstDate(),
      overdue = await currentIstDate(-1),
      upcoming = await currentIstDate(3),
      distant = await currentIstDate(8);
    const active = JSON.parse(
      await readFile(".playwright/local-admin.json", "utf8"),
    ) as { email: string };
    const client = await db();
    const { data: activeAdmin } = await client
      .from("admins")
      .select("id")
      .eq("email", active.email)
      .single();
    expect(activeAdmin).not.toBeNull();
    await createTask(page, value.bookingId!, `${value.marker} overdue`, {
      category: "decoration",
      priority: "urgent",
      dueDate: overdue,
      assignedAdminId: activeAdmin!.id,
    });
    await createTask(page, value.bookingId!, `${value.marker} upcoming`, {
      category: "food_catering",
      priority: "high",
      dueDate: upcoming,
    });
    await createTask(page, value.bookingId!, `${value.marker} distant`, {
      category: "transportation",
      priority: "low",
      dueDate: distant,
    });
    const planning = page
      .getByRole("heading", { name: "Event planning" })
      .locator("xpath=ancestor::section");
    await page.reload();
    const statusResponse = page.waitForResponse((r) =>
      r.url().includes(`/tasks?status=pending`),
    );
    await planning.getByLabel("status filter").selectOption("pending");
    expect((await statusResponse).status()).toBe(200);
    await expect(
      planning.getByText(`${value.marker} overdue`, { exact: false }),
    ).toBeVisible();
    const categoryResponse = page.waitForResponse((r) =>
      r.url().includes("category=food_catering"),
    );
    await planning.getByLabel("category filter").selectOption("food_catering");
    expect((await categoryResponse).status()).toBe(200);
    await expect(
      planning.getByText(`${value.marker} upcoming`, { exact: false }),
    ).toBeVisible();
    await expect(
      planning.getByText(`${value.marker} overdue`, { exact: false }),
    ).toHaveCount(0);
    const priorityResponse = page.waitForResponse((r) =>
      r.url().includes("priority=high"),
    );
    await planning.getByLabel("priority filter").selectOption("high");
    expect((await priorityResponse).status()).toBe(200);
    await expect(
      planning.getByText(`${value.marker} upcoming`, { exact: false }),
    ).toBeVisible();
    await planning.getByLabel("category filter").selectOption("");
    await planning.getByLabel("priority filter").selectOption("");
    const assignedResponse = page.waitForResponse((r) =>
      r.url().includes(`assignedAdminId=${activeAdmin!.id}`),
    );
    await planning
      .getByLabel("assignedAdminId filter")
      .selectOption(activeAdmin!.id);
    expect((await assignedResponse).status()).toBe(200);
    await expect(
      planning.getByText(`${value.marker} overdue`, { exact: false }),
    ).toBeVisible();
    await expect(
      planning.getByText(`${value.marker} upcoming`, { exact: false }),
    ).toHaveCount(0);
    await planning.getByLabel("assignedAdminId filter").selectOption("");
    const overdueResponse = page.waitForResponse((r) =>
      r.url().includes("overdue=true"),
    );
    await planning.getByLabel("Overdue").check();
    const overdueBody = await (await overdueResponse).json();
    expect(
      overdueBody.tasks.map((x: { due_date: string }) => x.due_date),
    ).toContain(overdue);
    await expect(
      planning.getByText(`${value.marker} overdue`, { exact: false }),
    ).toBeVisible();
    const upcomingResponse = page.waitForResponse((r) =>
      r.url().includes("upcoming=true"),
    );
    await planning.getByLabel("Upcoming").check();
    const upcomingBody = await (await upcomingResponse).json();
    expect(
      upcomingBody.tasks.map((x: { due_date: string }) => x.due_date),
    ).toContain(upcoming);
    expect(
      upcomingBody.tasks.map((x: { due_date: string }) => x.due_date),
    ).not.toContain(distant);
    await planning.getByLabel("Upcoming").uncheck();
    await expect(
      planning.getByText(`${value.marker} overdue`, { exact: false }),
    ).toBeVisible();
    const empty = await page.request.get(
      `/api/admin/bookings/${value.bookingId}/tasks?priority=low&category=decoration`,
    );
    expect(empty.status()).toBe(200);
    expect((await empty.json()).tasks).toEqual([]);
    const anonymous = await request.get(
      `/api/admin/bookings/${value.bookingId}/tasks`,
    );
    expect(anonymous.status()).toBe(401);
    const invalid = await page.request.patch(
      `/api/admin/bookings/${value.bookingId}/tasks/00000000-0000-0000-0000-000000000000`,
      {
        data: {
          title: "x",
          category: "general_administration",
          priority: "medium",
          lockVersion: 1,
        },
      },
    );
    expect(invalid.status()).toBe(404);
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  } finally {
    await clean(value);
  }
});

test("Scenario E recovers from edit failures and rejects a genuine stale browser edit", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const value = await fixture();
  let second: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    await login(page);
    await booking(page, value);
    const taskId = await createTask(
        page,
        value.bookingId!,
        `${value.marker} conflict`,
      ),
      client = await db();
    const initial = await client
      .from("event_tasks")
      .select("lock_version")
      .eq("id", taskId)
      .single();
    expect(initial.data?.lock_version).toBeTruthy();
    const url = `/admin/bookings/${value.bookingId}`;
    second = await browser.newContext();
    const other = await second.newPage();
    await login(other);
    await page.goto(url);
    await other.goto(url);
    const firstRow = taskRow(page, `${value.marker} conflict`),
      secondRow = taskRow(other, `${value.marker} conflict`);
    await firstRow.getByRole("button", { name: "Edit" }).click();
    await secondRow.getByRole("button", { name: "Edit" }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Description")
      .fill("first committed");
    const committed = page.waitForResponse(
      (r) =>
        r.url().includes(`/tasks/${taskId}`) &&
        r.request().method() === "PATCH",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save" })
      .click();
    expect((await committed).status()).toBe(200);
    const committedTask = await client
      .from("event_tasks")
      .select("description,lock_version")
      .eq("id", taskId)
      .single();
    expect(committedTask.data).toMatchObject({
      description: "first committed",
      lock_version: initial.data!.lock_version + 1,
    });
    await other
      .getByRole("dialog")
      .getByLabel("Description")
      .fill("stale write");
    const refreshed = other.waitForResponse(
      (r) =>
        r.url().includes(`/api/admin/bookings/${value.bookingId}/tasks?`) &&
        r.request().method() === "GET",
    );
    const stale = other.waitForResponse(
      (r) =>
        r.url().includes(`/tasks/${taskId}`) &&
        r.request().method() === "PATCH",
    );
    await other
      .getByRole("dialog")
      .getByRole("button", { name: "Save" })
      .click();
    const staleResponse = await stale;
    expect(staleResponse.status()).toBe(409);
    expect(JSON.parse(staleResponse.request().postData()!).lockVersion).toBe(
      initial.data!.lock_version,
    );
    await expect(other.getByRole("dialog").getByRole("alert")).toContainText(
      "Conflict",
    );
    expect((await refreshed).status()).toBe(200);
    expect(await (await refreshed).json()).toMatchObject({
      tasks: expect.arrayContaining([
        expect.objectContaining({
          id: taskId,
          description: "first committed",
          lock_version: committedTask.data!.lock_version,
        }),
      ]),
    });
    expect(
      (
        await client
          .from("event_tasks")
          .select("description,lock_version")
          .eq("id", taskId)
          .single()
      ).data,
    ).toEqual(committedTask.data);
    expect(
      (
        await client
          .from("event_task_activities")
          .select("id")
          .eq("task_id", taskId)
      ).data,
    ).toHaveLength(2);
  } finally {
    await second?.close();
    await clean(value);
  }
});

test("Scenario E enforces active assignment, booking-service ownership, and lifecycle eligibility", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const a = await fixture(),
    b = await fixture();
  let inactive = "";
  try {
    await login(page);
    await booking(page, a);
    await page.goto(`/admin/quotations/${b.quotationId}/edit`);
    await page.getByRole("button", { name: "Create booking" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm" })
      .click();
    await expect(page).toHaveURL(/\/bookings\//);
    b.bookingId = page.url().split("/").pop()!;
    const client = await db();
    const { data: inactiveAdmin, error } = await client
      .from("admins")
      .insert({
        email: `${a.marker}-inactive@local.test`,
        password_hash: "fixture",
        name: "Inactive fixture",
        role: "admin",
        is_active: false,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    inactive = inactiveAdmin!.id;
    const [{ data: serviceA }, { data: serviceB }] = await Promise.all([
      client
        .from("celebration_booking_services")
        .select("id")
        .eq("booking_id", a.bookingId)
        .single(),
      client
        .from("celebration_booking_services")
        .select("id")
        .eq("booking_id", b.bookingId)
        .single(),
    ]);
    const good = await page.request.post(
      `/api/admin/bookings/${a.bookingId}/tasks`,
      {
        data: {
          title: `${a.marker} owned`,
          category: "general_administration",
          priority: "medium",
          bookingServiceId: serviceA!.id,
        },
      },
    );
    expect(good.status()).toBe(201);
    const badService = await page.request.post(
      `/api/admin/bookings/${a.bookingId}/tasks`,
      {
        data: {
          title: `${a.marker} cross`,
          category: "general_administration",
          priority: "medium",
          bookingServiceId: serviceB!.id,
        },
      },
    );
    expect(badService.status()).toBe(400);
    expect((await badService.json()).error).toContain("does not belong");
    expect(
      (
        await client
          .from("event_tasks")
          .select("id")
          .eq("booking_id", a.bookingId)
          .eq("title", `${a.marker} cross`)
      ).data,
    ).toEqual([]);
    const inactiveRequest = await page.request.post(
      `/api/admin/bookings/${a.bookingId}/tasks`,
      {
        data: {
          title: `${a.marker} inactive`,
          category: "general_administration",
          priority: "medium",
          assignedAdminId: inactive,
        },
      },
    );
    expect(inactiveRequest.status()).toBe(400);
    expect((await inactiveRequest.json()).error).toContain("not active");
    await page.goto(`/admin/bookings/${a.bookingId}`);
    const planning = page
      .getByRole("heading", { name: "Event planning" })
      .locator("xpath=ancestor::section");
    await expect(
      planning
        .getByLabel("Assigned administrator")
        .locator("option", { hasText: `${a.marker}-inactive` }),
    ).toHaveCount(0);
    const unknown = await page.request.post(
      "/api/admin/bookings/00000000-0000-0000-0000-000000000000/tasks",
      {
        data: {
          title: "missing",
          category: "general_administration",
          priority: "medium",
        },
      },
    );
    expect(unknown.status()).toBe(404);
    const pending = await page.request.post(
      `/api/admin/bookings/${b.bookingId}/tasks`,
      {
        data: {
          title: "not eligible",
          category: "general_administration",
          priority: "medium",
        },
      },
    );
    expect(pending.status()).toBe(409);
    expect((await pending.json()).error).toContain("Confirm the booking");
  } finally {
    if (inactive) {
      const client = await db();
      await client.from("admins").delete().eq("id", inactive);
    }
    await clean(b);
    await clean(a);
  }
});

test("Scenario E edit/create failures recover and loading prevents duplicate submission", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const value = await fixture();
  try {
    await login(page);
    await booking(page, value);
    const taskId = await createTask(
      page,
      value.bookingId!,
      `${value.marker} retry`,
    );
    await page.goto(`/admin/bookings/${value.bookingId}`);
    const row = taskRow(page, `${value.marker} retry`);
    await row.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog");
    const endpoint = (url: URL) => url.pathname.endsWith(`/tasks/${taskId}`);
    for (const status of [400, 500]) {
      await page.route(endpoint, (route) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({ error: `Synthetic ${status}` }),
        }),
      );
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(dialog.getByRole("alert")).toContainText(
        `Synthetic ${status}`,
      );
      await page.unroute(endpoint);
    }
    await page.route(endpoint, (route) => route.abort("failed"));
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Failed to fetch");
    await page.unroute(endpoint);
    await dialog.getByLabel("Description").fill("retry committed");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    const client = await db();
    expect(
      (
        await client
          .from("event_tasks")
          .select("description")
          .eq("id", taskId)
          .single()
      ).data?.description,
    ).toBe("retry committed");
    const planning = page
        .getByRole("heading", { name: "Event planning" })
        .locator("xpath=ancestor::section"),
      create = planning.getByRole("button", { name: "Create task" });
    await create.click();
    await dialog.getByLabel("Task title").fill(`${value.marker} once`);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    await page.route(taskUrl(value.bookingId!), async (route: Route) => {
      calls++;
      await held;
      await route.continue();
    });
    await dialog.getByRole("button", { name: "Create task" }).click();
    await expect(
      dialog.getByRole("button", { name: "Creating…" }),
    ).toBeDisabled();
    await dialog
      .getByRole("button", { name: "Creating…" })
      .click({ force: true });
    expect(calls).toBe(1);
    release();
    await expect(dialog).toBeHidden();
    await page.unroute(taskUrl(value.bookingId!));
    expect(
      (
        await client
          .from("event_tasks")
          .select("id")
          .eq("booking_id", value.bookingId)
          .eq("title", `${value.marker} once`)
      ).data,
    ).toHaveLength(1);
  } finally {
    await clean(value);
  }
});
