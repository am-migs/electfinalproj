import { requireSupabase } from "./supabase.js";

const defaults = {
  inventory: [], projects: [], movements: [],
  profile: { name: "Administrator", email: "" },
  settings: { currency: "PHP", lowStockAlerts: true }
};

function fail(error) {
  if (error) throw new Error(error.message || "Supabase workspace request failed.");
}

export async function getUserWorkspace(user) {
  const client = requireSupabase();
  const { data: memberships, error: memberError } = await client
    .from("organization_members")
    .select("organization_id, role, organizations(id, name)")
    .eq("user_id", user.id)
    .limit(1);
  fail(memberError);

  const membership = memberships?.[0];
  if (!membership?.organizations) {
    throw new Error("No workspace membership was found for this account. Contact your workspace administrator.");
  }

  return {
    organization: membership.organizations,
    role: membership.role
  };
}

export async function loadCloudWorkspace(organizationId, user) {
  const client = requireSupabase();
  const [partsResult, projectsResult, movementsResult, profileResult] = await Promise.all([
    client.from("components").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("projects").select("*, bom_items(*)").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("stock_movements").select("*, components(name)").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle()
  ]);
  fail(partsResult.error); fail(projectsResult.error); fail(movementsResult.error); fail(profileResult.error);

  const inventory = (partsResult.data || []).map(row => ({
    id: row.id, mpn: row.mpn, name: row.name, manufacturer: row.manufacturer,
    category: row.category, packageType: row.package_type, footprint: row.footprint,
    location: row.storage_location, unitPrice: Number(row.unit_price || 0),
    stock: row.stock, minStock: row.minimum_stock, datasheet: row.datasheet_url || "",
    lcsc: row.lcsc_part_number || "", jlcpcb: row.jlcpcb_part_number || "",
    createdAt: row.created_at, updatedAt: row.updated_at
  }));

  const projects = (projectsResult.data || []).map(row => ({
    id: row.id, name: row.name, description: row.description,
    createdAt: row.created_at,
    items: (row.bom_items || []).map(line => ({
      id: line.id, partId: line.component_id, quantity: line.quantity,
      designators: (line.designators || []).join(", "), notes: line.notes || ""
    }))
  }));

  const movements = (movementsResult.data || []).map(row => ({
    id: row.id, partId: row.component_id, partName: row.components?.name || "Component",
    type: ({
      initial_stock: "Initial stock", stock_in: "Stock in", stock_out: "Stock out",
      adjustment: "Stock correction", reservation: "Reservation", release: "Release",
      consumption: "Consumption"
    })[row.movement_type] || row.movement_type,
    quantity: row.quantity, note: row.note, date: row.created_at
  }));

  return {
    ...defaults,
    inventory, projects, movements,
    profile: {
      name: profileResult.data?.full_name || user.user_metadata?.full_name || user.email || "User",
      email: profileResult.data?.email || user.email || ""
    }
  };
}

export async function saveCloudComponent(organizationId, userId, part) {
  const client = requireSupabase();
  const payload = {
    organization_id: organizationId, mpn: part.mpn, name: part.name,
    manufacturer: part.manufacturer || "", category: part.category || "Other",
    package_type: part.packageType || "Other", footprint: part.footprint || "",
    storage_location: part.location || "", unit_price: Number(part.unitPrice || 0),
    currency: "PHP", stock: Number(part.stock || 0),
    minimum_stock: Number(part.minStock || 0), datasheet_url: part.datasheet || null,
    lcsc_part_number: part.lcsc || null, jlcpcb_part_number: part.jlcpcb || null,
    updated_by: userId
  };
  if (part.id) payload.id = part.id;
  const { data, error } = await client.from("components").upsert(payload, { onConflict: "id" }).select().single();
  fail(error);
  return data;
}

export async function deleteCloudComponent(organizationId, componentId) {
  const client = requireSupabase();
  const { error } = await client.from("components")
    .delete().eq("organization_id", organizationId).eq("id", componentId);
  fail(error);
}
