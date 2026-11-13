export type QuotationActivityRecord = {
  id: string;
  event_type: "status_transition" | "expired" | "reopened" | "delivery_recorded";
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type QuotationDeliveryRecord = {
  id: string;
  recipient_name: string;
  recipient_contact: string;
  channel: "manual" | "email" | "whatsapp";
  delivery_kind: "manual" | "provider_verified";
  notes: string | null;
  delivered_at: string;
  created_at: string;
};

export type QuotationActivityData = {
  quotation: {
    id: string;
    quotation_number: string;
    status: string;
    valid_until: string | null;
    created_at?: string;
  };
  effectiveStatus: string;
  activity: QuotationActivityRecord[];
  deliveries: QuotationDeliveryRecord[];
};

export type QuotationTimelineEntry = {
  id: string;
  kind: "created" | "status_transition" | "expired" | "reopened" | "delivery_recorded";
  title: string;
  timestamp: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  renewedValidity?: string;
  delivery?: QuotationDeliveryRecord;
};

const eventTitles = {
  status_transition: "Status changed",
  expired: "Quotation expired",
  reopened: "Quotation reopened",
  delivery_recorded: "Delivery recorded",
};

export function buildQuotationTimeline(data: QuotationActivityData): QuotationTimelineEntry[] {
  const entries: QuotationTimelineEntry[] = [];
  const deliveries = new Map(data.deliveries.map((delivery) => [delivery.id, delivery]));
  const includedDeliveries = new Set<string>();

  for (const event of data.activity) {
    const deliveryId = typeof event.metadata?.delivery_id === "string" ? event.metadata.delivery_id : undefined;
    if (event.event_type === "delivery_recorded" && deliveryId) {
      if (includedDeliveries.has(deliveryId)) continue;
      includedDeliveries.add(deliveryId);
    }
    entries.push({
      id: `activity-${event.id}`,
      kind: event.event_type,
      title: eventTitles[event.event_type],
      timestamp: event.created_at,
      previousStatus: event.previous_status,
      newStatus: event.new_status,
      renewedValidity: event.event_type === "reopened" && typeof event.metadata?.valid_until === "string" ? event.metadata.valid_until : undefined,
      delivery: event.event_type === "delivery_recorded" && deliveryId ? deliveries.get(deliveryId) : undefined,
    });
  }

  // A retained delivery without its activity row is still an existing record.
  for (const delivery of data.deliveries) {
    if (includedDeliveries.has(delivery.id)) continue;
    entries.push({ id: `delivery-${delivery.id}`, kind: "delivery_recorded", title: "Delivery recorded", timestamp: delivery.created_at || delivery.delivered_at, delivery });
  }

  if (data.quotation.created_at) {
    entries.push({ id: "quotation-created", kind: "created", title: "Quotation created", timestamp: data.quotation.created_at });
  }

  return entries.sort((left, right) => {
    const difference = Date.parse(right.timestamp) - Date.parse(left.timestamp);
    if (difference) return difference;
    if (left.kind === "created") return 1;
    if (right.kind === "created") return -1;
    return left.id.localeCompare(right.id);
  });
}
