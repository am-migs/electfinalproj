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

const movementTypes = {
  "Initial stock": "initial_stock", "Stock in": "stock_in",
  "Stock out": "stock_out", "Stock correction": "adjustment",
  "Reservation": "reservation", "Release": "release", "Consumption": "consumption"
};

export async function syncCloudWorkspace(organizationId, user, next, previous) {
  const client = requireSupabase();
  const before = previous || defaults;
  const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
  const currentParts = next.inventory || [];
  const currentProjects = next.projects || [];
  const currentMovements = next.movements || [];

  if (currentParts.length) {
    const payload = currentParts.map(part => ({
      id: part.id, organization_id: organizationId, mpn: part.mpn, name: part.name,
      manufacturer: part.manufacturer || "", category: part.category || "Other",
      package_type: part.packageType || "Other", footprint: part.footprint || "",
      storage_location: part.location || "", unit_price: Number(part.unitPrice || 0),
      currency: next.settings?.currency || "PHP", stock: Number(part.stock || 0),
      minimum_stock: Number(part.minStock || 0), datasheet_url: part.datasheet || null,
      lcsc_part_number: part.lcsc || null, jlcpcb_part_number: part.jlcpcb || null,
      updated_by: user.id
    }));
    const { error } = await client.from("components").upsert(payload, { onConflict: "id" });
    fail(error);
  }

  const changedProjects = currentProjects.filter(project =>
    changed(project, (before.projects || []).find(old => old.id === project.id))
  );
  if (changedProjects.length) {
    const { error } = await client.from("projects").upsert(changedProjects.map(project => ({
      id: project.id, organization_id: organizationId, name: project.name,
      description: project.description || "", created_by: user.id
    })), { onConflict: "id" });
    fail(error);
  }

  const currentLines = currentProjects.flatMap(project => (project.items || []).map(line => ({
    id: line.id, organization_id: organizationId, project_id: project.id,
    component_id: line.partId, quantity: Number(line.quantity),
    designators: String(line.designators || "").split(",").map(value => value.trim()).filter(Boolean),
    notes: line.notes || ""
  })));
  if (currentLines.length) {
    const { error } = await client.from("bom_items").upsert(currentLines, { onConflict: "id" });
    fail(error);
  }

  const previousMovementIds = new Set((before.movements || []).map(item => item.id));
  const newMovements = currentMovements.filter(item => !previousMovementIds.has(item.id));
  if (newMovements.length) {
    const { data: alreadyStored, error: lookupError } = await client.from("stock_movements").select("id").eq("organization_id", organizationId).in("id", newMovements.map(item => item.id));
    fail(lookupError);
    const storedIds = new Set((alreadyStored || []).map(row => row.id));
    const movementsToInsert = newMovements.filter(item => !storedIds.has(item.id));
    if (!movementsToInsert.length) return;
    const partMap = new Map(currentParts.map(part => [part.id, part]));
    const { error } = await client.from("stock_movements").insert(movementsToInsert.map(item => ({
      id: item.id, organization_id: organizationId, component_id: item.partId,
      movement_type: movementTypes[item.type] || "adjustment",
      quantity: Math.max(1, Number(item.quantity || 1)),
      quantity_before: Number(item.quantityBefore ?? 0), quantity_after: Number(item.quantityAfter ?? partMap.get(item.partId)?.stock ?? 0),
      note: item.note || "", created_by: user.id,
      created_at: item.date || new Date().toISOString()
    })));
    fail(error);
  }

  const oldLineIds = (before.projects || []).flatMap(project => (project.items || []).map(line => line.id));
  const newLineIds = new Set(currentLines.map(line => line.id));
  const removedLineIds = oldLineIds.filter(id => !newLineIds.has(id));
  if (removedLineIds.length) {
    const { error } = await client.from("bom_items").delete()
      .eq("organization_id", organizationId).in("id", removedLineIds);
    fail(error);
  }

  const newProjectIds = new Set(currentProjects.map(project => project.id));
  const removedProjectIds = (before.projects || []).filter(project => !newProjectIds.has(project.id)).map(project => project.id);
  if (removedProjectIds.length) {
    const { error } = await client.from("projects").delete()
      .eq("organization_id", organizationId).in("id", removedProjectIds);
    fail(error);
  }

  const newPartIds = new Set(currentParts.map(part => part.id));
  const removedPartIds = (before.inventory || []).filter(part => !newPartIds.has(part.id)).map(part => part.id);
  if (removedPartIds.length) {
    const { error } = await client.from("components").delete()
      .eq("organization_id", organizationId).in("id", removedPartIds);
    fail(error);
  }

  if (changed(next.profile, before.profile) && next.profile) {
    const { error } = await client.from("profiles").update({
      full_name: next.profile.name || "", email: next.profile.email || ""
    }).eq("id", user.id);
    fail(error);
  }
}
