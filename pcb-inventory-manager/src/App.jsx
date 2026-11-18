import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, Boxes, FileSpreadsheet, Cpu, ChartNoAxesCombined,
  Settings, Plus, Search, Trash2, Pencil, Download, Upload, Package,
  AlertTriangle, Wallet, ArrowDownUp, Printer, RefreshCw, X, Save,
  FolderPlus, FileDown, History, Filter, RotateCcw
} from "lucide-react";
import { searchComponents, getCatalogueInformation } from "../js/services/jlcparts.js";
import AuthScreen from "./components/AuthScreen.jsx";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";
import { getUserWorkspace, loadCloudWorkspace, syncCloudWorkspace } from "./lib/workspace.js";

const STORE_KEY = "pcbManagerReactV2";
const blankPart = {
  mpn: "", name: "", manufacturer: "", category: "Other", packageType: "Other",
  footprint: "", location: "", unitPrice: "0", stock: "0", minStock: "0", datasheet: ""
};
const initial = {
  inventory: [], projects: [], movements: [],
  profile: { name: "Administrator", email: "" },
  settings: { currency: "PHP", lowStockAlerts: true }
};
const categories = ["Microcontrollers", "Resistors", "Capacitors", "Connectors", "Sensors", "ICs", "Diodes", "Transistors", "Inductors", "Modules", "Other"];
const nav = [
  ["Dashboard", LayoutDashboard], ["Inventory", Boxes], ["BOM Manager", FileSpreadsheet],
  ["Pinout Inspector", Cpu], ["Analytics", ChartNoAxesCombined], ["Settings", Settings]
];
const makeId = () => globalThis.crypto?.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
const money = (n, currency) => {
  try { return new Intl.NumberFormat("en-PH", { style: "currency", currency: currency || "PHP" }).format(Number(n) || 0); }
  catch { return "₱" + (Number(n) || 0).toFixed(2); }
};
const dateLabel = value => value ? new Date(value).toLocaleString() : "—";
const csvCell = value => '"' + String(value ?? "").replaceAll('"', '""') + '"';
const downloadText = (name, text, type) => {
  const url = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function loadWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return {
      ...initial, ...saved,
      profile: { ...initial.profile, ...(saved.profile || {}) },
      settings: { ...initial.settings, ...(saved.settings || {}) },
      inventory: Array.isArray(saved.inventory) ? saved.inventory : [],
      projects: Array.isArray(saved.projects) ? saved.projects : [],
      movements: Array.isArray(saved.movements) ? saved.movements : []
    };
  } catch { return initial; }
}
function parseCSV(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows.shift().map(h => (h.charCodeAt(0) === 0xFEFF ? h.slice(1) : h).trim().toLowerCase());
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}
function WorkspaceApp({ user, organization, role, onSignOut }) {
  const [db, setDb] = useState(initial);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState("");
  const [cloudReady, setCloudReady] = useState(false);
  const cloudSnapshot = useRef(null);
  const cloudQueue = useRef(Promise.resolve());
  const [page, setPage] = useState("Dashboard");
  const [form, setForm] = useState(blankPart);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("name");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [results, setResults] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("Search the free JLCParts catalogue by LCSC number, manufacturer, or description.");
  const [busy, setBusy] = useState(false);
  const [catalogInfo, setCatalogInfo] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [bomPartId, setBomPartId] = useState("");
  const [bomQty, setBomQty] = useState("1");
  const [bomDesignators, setBomDesignators] = useState("");
  const [device, setDevice] = useState("ESP32 DevKit V1");
  const [pinQuery, setPinQuery] = useState("");
  const [movementPart, setMovementPart] = useState("");
  const [movementQty, setMovementQty] = useState("1");
  const [movementNote, setMovementNote] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");
  const restoreRef = useRef(null);
  const [historyFilter, setHistoryFilter] = useState("All");

  useEffect(() => {
    let active = true;
    setCloudLoading(true);
    loadCloudWorkspace(organization.id, user).then(data => {
      if (active) { setDb(data); cloudSnapshot.current = data; setCloudError(""); setCloudReady(true); }
    }).catch(error => { if (active) setCloudError(error.message || "Unable to load cloud workspace."); })
      .finally(() => { if (active) setCloudLoading(false); });
    return () => { active = false; };
  }, [organization.id, user]);
  useEffect(() => { getCatalogueInformation().then(setCatalogInfo).catch(() => {}); }, [] );
  useEffect(() => {
    if (!cloudReady || !cloudSnapshot.current) return;
    if (!["owner", "admin", "editor"].includes(role)) return;
    const snapshot = db;
    const previous = cloudSnapshot.current;
    if (snapshot === previous) return;
    cloudQueue.current = cloudQueue.current.then(() =>
      syncCloudWorkspace(organization.id, user, snapshot, previous)
    ).then(() => { cloudSnapshot.current = snapshot; setCloudError(""); })
      .catch(error => { setCloudError("Cloud save failed: " + (error.message || "Unknown database error")); });
  }, [db, cloudReady, organization.id, user, role]);

  const inventory = db.inventory || [];
  const projects = db.projects || [];
  const movements = db.movements || [];
  const units = inventory.reduce((sum, part) => sum + Number(part.stock || 0), 0);
  const low = inventory.filter(part => Number(part.stock || 0) <= Number(part.minStock || 0));
  const value = inventory.reduce((sum, part) => sum + Number(part.stock || 0) * Number(part.unitPrice || 0), 0);
  const filtered = useMemo(() => inventory.filter(part => {
    const text = [part.mpn, part.name, part.manufacturer, part.location, part.category].join(" ").toLowerCase();
    return text.includes(query.toLowerCase()) && (category === "All" || part.category === category);
  }).sort((a, b) => {
    if (sort === "stock") return Number(a.stock) - Number(b.stock);
    if (sort === "value") return (Number(b.stock) * Number(b.unitPrice)) - (Number(a.stock) * Number(a.unitPrice));
    return String(a[sort] || "").localeCompare(String(b[sort] || ""));
  }), [inventory, query, category, sort]);
  const update = patch => {
    if (!["owner", "admin", "editor"].includes(role)) { alert("Your workspace role is read-only. Ask an administrator for edit access."); return; }
    setDb(old => ({ ...old, ...patch }));
  };
  const resetPartForm = () => { setEditing(null); setForm(blankPart); };
  const savePart = event => {
    event.preventDefault();
    const mpn = form.mpn.trim(), name = form.name.trim();
    if (!mpn || !name) return alert("Part number and component name are required.");
    if (inventory.some(part => String(part.mpn).toLowerCase() === mpn.toLowerCase() && part.id !== editing)) return alert("This part number already exists.");
    const part = {
      ...form, id: editing || makeId(), mpn, name,
      unitPrice: Math.max(0, Number(form.unitPrice) || 0),
      stock: Math.max(0, Number(form.stock) || 0),
      minStock: Math.max(0, Number(form.minStock) || 0),
      updatedAt: new Date().toISOString(),
      createdAt: editing ? (inventory.find(x => x.id === editing)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };
    const previousStock = editing ? Number(inventory.find(x => x.id === editing)?.stock || 0) : 0;
    const stockDifference = part.stock - previousStock;
    const stockMovement = stockDifference === 0 ? null : {
      id: makeId(),
      partId: part.id,
      partName: part.name,
      type: editing ? "Stock correction" : "Initial stock",
      quantity: Math.abs(stockDifference),
      note: editing
        ? `Component details edited (stock changed from ${previousStock} to ${part.stock}).`
        : "Initial inventory entry",
      date: new Date().toISOString()
    };
    update({
      inventory: editing ? inventory.map(x => x.id === editing ? part : x) : [part, ...inventory],
      movements: stockMovement ? [stockMovement, ...movements] : movements
    });
    resetPartForm();
  };
  const editPart = part => {
    setEditing(part.id);
    setForm({ ...blankPart, ...part, unitPrice: String(part.unitPrice ?? 0), stock: String(part.stock ?? 0), minStock: String(part.minStock ?? 0) });
    document.getElementById("component-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const deletePart = part => {
    if (!confirm("Delete " + part.name + "? This also removes it from BOM lines.")) return;
    update({
      inventory: inventory.filter(x => x.id !== part.id),
      projects: projects.map(p => ({ ...p, items: (p.items || []).filter(line => line.partId !== part.id) }))
    });
  };
  const adjustStock = () => {
    const part = inventory.find(x => x.id === movementPart);
    const amount = Number(movementQty);
    if (!part || !Number.isFinite(amount) || amount <= 0) return alert("Select a component and enter a quantity greater than zero.");
    const next = movementType === "Stock in" ? Number(part.stock) + amount : Number(part.stock) - amount;
    if (next < 0) return alert("Insufficient stock. Available quantity: " + part.stock);
    update({
      inventory: inventory.map(x => x.id === part.id ? { ...x, stock: next, updatedAt: new Date().toISOString() } : x),
      movements: [{ id: makeId(), partId: part.id, partName: part.name, type: movementType, quantity: amount, note: movementNote.trim(), date: new Date().toISOString() }, ...movements]
    });
    setMovementQty("1"); setMovementNote("");
  };
  const [movementType, setMovementType] = useState("Stock in");
  const runCatalogSearch = async event => {
    event.preventDefault();
    if (catalogQuery.trim().length < 3) { setCatalogStatus("Enter at least 3 characters."); return; }
    setBusy(true); setResults([]); setCatalogStatus("Loading catalogue index. First search may take longer.");
    try {
      const found = await searchComponents(catalogQuery, { limit: 30 });
      setResults(found); setCatalogStatus(found.length ? found.length + " matching components found." : "No matching components found.");
    } catch (error) { setCatalogStatus(error.message || "Catalogue search failed. Check your connection."); }
    finally { setBusy(false); }
  };
  const useCatalogPart = part => {
    setForm({ ...blankPart, mpn: part.lcsc || "", name: part.description || "", manufacturer: part.manufacturer || "", category: categories.includes(part.category) ? part.category : "Other", datasheet: part.datasheet || "", unitPrice: part.price || "0" });
    setEditing(null);
    document.getElementById("component-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const createProject = event => {
    event.preventDefault();
    if (!projectName.trim()) return;
    const project = { id: makeId(), name: projectName.trim(), description: "", items: [], createdAt: new Date().toISOString() };
    update({ projects: [project, ...projects] }); setProjectId(project.id); setProjectName("");
  };
  const project = projects.find(p => p.id === projectId);
  const addBomLine = () => {
    const part = inventory.find(x => x.id === bomPartId), qty = Number(bomQty);
    if (!project || !part || !Number.isInteger(qty) || qty < 1) return alert("Choose a component and enter a whole-number quantity greater than zero.");
    const existing = (project.items || []).find(x => x.partId === part.id);
    const line = existing
      ? { ...existing, quantity: existing.quantity + qty, designators: [existing.designators, bomDesignators].filter(Boolean).join(", ") }
      : { id: makeId(), partId: part.id, quantity: qty, designators: bomDesignators.trim() };
    update({ projects: projects.map(p => p.id === project.id ? { ...p, items: existing ? p.items.map(x => x.partId === part.id ? line : x) : [...(p.items || []), line] } : p) });
    setBomPartId(""); setBomQty("1"); setBomDesignators("");
  };
  const updateBomLine = (lineId, patch) => update({ projects: projects.map(p => p.id === projectId ? { ...p, items: p.items.map(line => line.id === lineId ? { ...line, ...patch } : line) } : p) });
  const deleteProject = id => {
    if (!confirm("Delete this project and its BOM?")) return;
    update({ projects: projects.filter(p => p.id !== id) }); if (projectId === id) setProjectId("");
  };
  const exportInventoryCSV = () => {
    const columns = ["mpn", "name", "manufacturer", "category", "packageType", "footprint", "location", "unitPrice", "stock", "minStock", "datasheet"];
    downloadText("pcb-inventory.csv", [columns.join(","), ...inventory.map(part => columns.map(key => csvCell(part[key])).join(","))].join("\n"), "text/csv;charset=utf-8");
  };
  const exportBomCSV = p => {
    const lines = [["MPN", "Component", "Designators", "Quantity", "In Stock", "Shortage", "Unit Cost", "Line Cost"]];
    (p.items || []).forEach(line => {
      const part = inventory.find(x => x.id === line.partId); if (!part) return;
      lines.push([part.mpn, part.name, line.designators || "", line.quantity, part.stock, Math.max(0, line.quantity - part.stock), part.unitPrice, line.quantity * part.unitPrice]);
    });
    downloadText((p.name || "project").replace(/[^a-z0-9-_]+/gi, "-") + "-bom.csv", lines.map(row => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8");
  };
  const importCSV = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const rows = parseCSV(await file.text());
      let added = 0, skipped = 0;
      const next = [...inventory];
      const importedMovements = [];
      rows.forEach(row => {
        const mpn = row.mpn || row.lcsc || row.partnumber || "";
        if (!mpn.trim() || next.some(x => String(x.mpn).toLowerCase() === mpn.trim().toLowerCase())) { skipped++; return; }
        next.push({
          ...blankPart, ...row, id: makeId(), mpn: mpn.trim(),
          name: row.name || row.description || mpn,
          unitPrice: Math.max(0, Number(row.unitprice ?? row.price) || 0),
          stock: Math.max(0, Number(row.stock) || 0),
          minStock: Math.max(0, Number(row.minstock) || 0)
        });
        if (Number(row.stock) > 0) {
          const importedPart = next[next.length - 1];
          importedMovements.push({
            id: makeId(),
            partId: importedPart.id,
            partName: importedPart.name,
            type: "Initial stock",
            quantity: importedPart.stock,
            note: "Imported from CSV",
            date: new Date().toISOString()
          });
        }
        added++;
      });
      update({ inventory: next, movements: [...importedMovements, ...movements] });
      alert("CSV import complete. Added: " + added + ". Skipped: " + skipped + ".");
    } catch (error) { alert("Unable to import CSV: " + error.message); }
    event.target.value = "";
  };
  const backup = () => downloadText("pcb-inventory-backup-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ ...db, exportedAt: new Date().toISOString(), schemaVersion: 2 }, null, 2), "application/json");
  const restoreBackup = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.inventory) || !Array.isArray(data.projects)) throw new Error("This file is not a valid PCB Manager backup.");
      if (!confirm("Restore this backup? It will replace the current inventory, projects, settings, and movement history.")) return;
      update({
        inventory: data.inventory, projects: data.projects, movements: Array.isArray(data.movements) ? data.movements : [],
        profile: { ...initial.profile, ...(data.profile || {}) },
        settings: { ...initial.settings, ...(data.settings || {}) }
      });
      setRestoreMessage("Backup restored successfully.");
    } catch (error) { setRestoreMessage("Restore failed: " + error.message); }
    event.target.value = "";
  };
  const printLabels = () => {
    const selected = inventory.filter(x => x.mpn);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return alert("Allow pop-ups to print component labels.");
    win.document.write("<html><head><title>PCB Component Labels</title><style>body{font-family:Arial;padding:20px}.labels{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.label{border:1px solid #333;padding:12px;min-height:75px;break-inside:avoid}.mpn{font-weight:bold;font-size:16px}.small{font-size:11px;margin-top:5px}</style></head><body><div class='labels'>" + selected.map(x => "<div class='label'><div class='mpn'>" + escapeHtml(x.mpn) + "</div><div>" + escapeHtml(x.name) + "</div><div class='small'>" + escapeHtml(x.location || "") + " · Qty " + Number(x.stock || 0) + "</div></div>").join("") + "</div><script>window.onload=()=>window.print()<\/script></body></html>");
    win.document.close();
  };
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const selectedProjectLines = (project?.items || []).map(line => ({ ...line, part: inventory.find(x => x.id === line.partId) })).filter(x => x.part);
  const bomCost = selectedProjectLines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.part.unitPrice), 0);
  const bomShortages = selectedProjectLines.filter(line => Number(line.quantity) > Number(line.part.stock));
  const pinNames = device === "ESP32 DevKit V1"
    ? ["3V3","EN","VP/GPIO36","VN/GPIO39","GPIO34","GPIO35","GPIO32","GPIO33","GPIO25","GPIO26","GPIO27","GPIO14","GPIO12","GND","GPIO13","VIN","GND","GPIO23","GPIO22","TX0","RX0","GPIO21","GPIO19","GPIO18","GPIO5","GPIO17","GPIO16","GPIO4","GPIO0","GPIO2"]
    : ["RESET","RXD","TXD","INT0","INT1","T0","VCC","GND","XTAL1","XTAL2","T1","OC0A","AIN1","ICP1","OC1A","SS","MOSI","MISO","SCK","AVCC","AREF","GND","ADC0","ADC1","ADC2","ADC3","SDA","SCL"];
  const heading = (title, desc, action) => <div className="heading"><div><h2>{title}</h2><p>{desc}</p></div>{action}</div>;
  const stat = (label, val, Icon, note) => <div className="card"><small><Icon size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />{label}</small><strong>{val}</strong><span className="muted">{note || "Workspace summary"}</span></div>;
  const renderDashboard = () => <><div className="welcome"><h2>Welcome to PCB Manager</h2><p>Manage electronic components, inventory, and project bills of materials.</p></div><div className="stats">{stat("Component Types", inventory.length, Package, "Registered parts")}{stat("Stock Units", units, Boxes, "Available quantity")}{stat("Low Stock Alerts", low.length, AlertTriangle, "At or below minimum")}{stat("Inventory Value", money(value, db.settings.currency), Wallet, "Estimated stock value")}</div><div className="grid"><section className="panel"><h3>Recently Updated Inventory</h3>{inventory.slice().sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt))).slice(0,6).map(part=><div className="row" key={part.id}><div><b>{part.name}</b><small className="muted" style={{ display: "block" }}>{part.mpn} · {part.location || "No location"}</small></div><span className="pill">{part.stock} units</span></div>)}{!inventory.length && <div className="empty">No inventory data yet. Add your first component.</div>}</section><section className="panel"><h3>Stock Alerts</h3>{low.map(part=><div className="row" key={part.id}><span>{part.name}</span><span className="pill low">{part.stock}/{part.minStock}</span></div>)}{!low.length && <div className="empty">All components are above minimum stock.</div>}</section></div><section className="panel"><h3>Recent Stock Movements</h3>{movements.slice(0,5).map(move=><div className="row" key={move.id}><span>{move.partName} · {move.type}</span><span className="muted">{move.quantity} · {dateLabel(move.date)}</span></div>)}{!movements.length && <div className="empty">Stock adjustments will appear here.</div>}</section></>;
  const renderInventory = () => <>{heading("Inventory Catalog", "Add, edit, search, import, and track electronic components.", <div className="toolbar"><button className="btn" onClick={resetPartForm}><Plus size={14}/> New Component</button><button className="btn alt" onClick={exportInventoryCSV}><FileDown size={14}/> Export CSV</button></div>)}<section className="panel" id="component-form"><h3>{editing ? "Edit Component" : "Component Details"}</h3><form className="form" onSubmit={savePart}>{[["mpn","Part number"],["name","Component name"],["manufacturer","Manufacturer"],["footprint","Footprint"],["location","Storage location"],["unitPrice","Unit price"],["stock","Stock quantity"],["minStock","Minimum stock"],["datasheet","Datasheet URL"]].map(([key,label])=><label key={key}>{label}<input value={form[key] ?? ""} required={["mpn","name"].includes(key)} type={["unitPrice","stock","minStock"].includes(key) ? "number" : "text"} min="0" step={key === "unitPrice" ? "0.01" : "1"} onChange={e=>setForm({ ...form, [key]: e.target.value })}/></label>)}<label>Category<select value={form.category} onChange={e=>setForm({ ...form, category: e.target.value })}>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label>Package<select value={form.packageType} onChange={e=>setForm({ ...form, packageType: e.target.value })}>{["SMD","Through-Hole","BGA","QFN","SOIC","DIP","Other"].map(x=><option key={x}>{x}</option>)}</select></label><div className="wide"><button className="btn"><Save size={14}/>{editing ? " Save Changes" : " Add to Inventory"}</button> <button className="btn alt" type="button" onClick={resetPartForm}>Clear</button></div></form></section><section className="panel"><h3>JLCParts Open Catalogue</h3><p className="muted">Open-source JLCPCB catalogue data. No API key required; first search may download catalogue indexes and data shards.</p><form className="toolbar" onSubmit={runCatalogSearch}><input className="field" placeholder="LCSC number, manufacturer, description..." value={catalogQuery} onChange={e=>setCatalogQuery(e.target.value)}/><button className="btn" disabled={busy}><Search size={14}/>{busy ? " Searching..." : " Search Catalogue"}</button></form><p className="muted">{catalogStatus}{catalogInfo?.totalComponents ? " · " + Number(catalogInfo.totalComponents).toLocaleString() + " catalogue records" : ""}</p>{results.map(part=><div className="row" key={part.lcsc}><div><b>{part.lcsc} · {part.description}</b><small className="muted" style={{ display: "block" }}>{part.manufacturer} · {part.category}</small></div><button className="btn alt" onClick={()=>useCatalogPart(part)}>Use component</button></div>)}</section><section className="panel"><div className="heading"><div><h3>Stored Components ({filtered.length})</h3><p>Inventory records and current stock value</p></div><div className="toolbar"><label className="btn alt"><Upload size={14}/> Import CSV<input hidden type="file" accept=".csv,text/csv" onChange={importCSV}/></label><button className="btn alt" onClick={printLabels}><Printer size={14}/> Print Labels</button></div></div><div className="toolbar"><input className="field" placeholder="Search MPN, name, maker, location..." value={query} onChange={e=>setQuery(e.target.value)}/><select className="field" value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{categories.map(x=><option key={x}>{x}</option>)}</select><select className="field" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Sort: Name</option><option value="mpn">Sort: MPN</option><option value="stock">Sort: Lowest Stock</option><option value="value">Sort: Highest Value</option></select></div><div className="scroll"><table className="table"><thead><tr><th>MPN</th><th>Component</th><th>Category</th><th>Location</th><th>Stock</th><th>Unit Cost</th><th>Stock Value</th><th>Actions</th></tr></thead><tbody>{filtered.map(part=><tr key={part.id}><td>{part.mpn}</td><td>{part.name}<small className="muted" style={{ display: "block" }}>{part.manufacturer}</small></td><td>{part.category}</td><td>{part.location || "—"}</td><td><span className={Number(part.stock) <= Number(part.minStock) ? "pill low" : "pill"}>{part.stock}</span></td><td>{money(part.unitPrice, db.settings.currency)}</td><td>{money(part.stock * part.unitPrice, db.settings.currency)}</td><td><button className="btn alt" title="Edit" onClick={()=>editPart(part)}><Pencil size={13}/></button> <button className="btn alt" title="Delete" onClick={()=>deletePart(part)}><Trash2 size={13}/></button></td></tr>)}</tbody></table>{!filtered.length && <div className="empty">No matching inventory records.</div>}</div></section><section className="panel"><h3><ArrowDownUp size={16}/> Stock Adjustment</h3><div className="toolbar"><select className="field" value={movementPart} onChange={e=>setMovementPart(e.target.value)}><option value="">Select component</option>{inventory.map(part=><option key={part.id} value={part.id}>{part.mpn} — {part.name} (stock: {part.stock})</option>)}</select><select className="field" value={movementType} onChange={e=>setMovementType(e.target.value)}><option>Stock in</option><option>Stock out</option></select><input className="field" type="number" min="1" step="1" value={movementQty} onChange={e=>setMovementQty(e.target.value)} placeholder="Quantity"/><input className="field" value={movementNote} onChange={e=>setMovementNote(e.target.value)} placeholder="Reason / reference"/><button className="btn" onClick={adjustStock}>Apply Adjustment</button></div><h3><History size={16}/> Movement History</h3><div className="toolbar"><select className="field" value={historyFilter} onChange={e=>setHistoryFilter(e.target.value)}><option>All</option><option>Stock in</option><option>Stock out</option><option>Initial stock</option></select></div>{movements.filter(m=>historyFilter==="All"||m.type===historyFilter).slice(0,30).map(move=><div className="row" key={move.id}><span><b>{move.partName}</b><small className="muted" style={{ display: "block" }}>{move.type} · {move.note || "No note"}</small></span><span className="muted">{move.quantity} · {dateLabel(move.date)}</span></div>)}{!movements.length && <div className="empty">No stock movements recorded.</div>}</section></>;
  const renderBom = () => <>{heading("Bill of Materials Manager", "Create projects, define component requirements, and calculate build costs.")}<section className="panel"><form className="toolbar" onSubmit={createProject}><input className="field" placeholder="New project name..." value={projectName} onChange={e=>setProjectName(e.target.value)}/><button className="btn"><FolderPlus size={14}/> Create Project</button></form><div className="toolbar"><select className="field" value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Select project</option>{projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select>{project && <button className="btn alt" onClick={()=>deleteProject(project.id)}><Trash2 size={14}/> Delete Project</button>}</div></section>{project && <><section className="panel"><div className="heading"><div><h3>{project.name}</h3><p>{selectedProjectLines.length} BOM line items</p></div><button className="btn alt" onClick={()=>exportBomCSV(project)}><FileDown size={14}/> Export BOM CSV</button></div><div className="toolbar"><select className="field" value={bomPartId} onChange={e=>setBomPartId(e.target.value)}><option value="">Select inventory component</option>{inventory.map(part=><option value={part.id} key={part.id}>{part.mpn} — {part.name}</option>)}</select><input className="field" type="number" min="1" step="1" value={bomQty} onChange={e=>setBomQty(e.target.value)} placeholder="Required qty"/><input className="field" value={bomDesignators} onChange={e=>setBomDesignators(e.target.value)} placeholder="Designators (e.g. R1, R2)"/><button className="btn" onClick={addBomLine}><Plus size={14}/> Add to BOM</button></div><div className="scroll"><table className="table"><thead><tr><th>MPN / Component</th><th>Designators</th><th>Required</th><th>Available</th><th>Shortage</th><th>Unit Cost</th><th>Line Cost</th><th></th></tr></thead><tbody>{selectedProjectLines.map(line=><tr key={line.id}><td>{line.part.mpn}<small className="muted" style={{ display: "block" }}>{line.part.name}</small></td><td><input className="field" value={line.designators || ""} onChange={e=>updateBomLine(line.id,{ designators: e.target.value })}/></td><td><input className="field" type="number" min="1" step="1" value={line.quantity} style={{ width: 85 }} onChange={e=>updateBomLine(line.id,{ quantity: Math.max(1, Number(e.target.value) || 1) })}/></td><td>{line.part.stock}</td><td><span className={line.quantity > line.part.stock ? "pill low" : "pill"}>{Math.max(0, line.quantity - line.part.stock)}</span></td><td>{money(line.part.unitPrice, db.settings.currency)}</td><td>{money(line.quantity * line.part.unitPrice, db.settings.currency)}</td><td><button className="btn alt" onClick={()=>update({ projects: projects.map(p=>p.id===project.id ? { ...p, items: p.items.filter(x=>x.id!==line.id) } : p) })}><Trash2 size={13}/></button></td></tr>)}</tbody></table>{!selectedProjectLines.length && <div className="empty">Add inventory components to this bill of materials.</div>}</div><div className="stats" style={{ marginTop: 15 }}>{stat("Estimated BOM Cost",money(bomCost,db.settings.currency),Wallet,"Based on current unit costs")}{stat("BOM Line Items",selectedProjectLines.length,FileSpreadsheet)}{stat("Shortage Lines",bomShortages.length,AlertTriangle,"Items requiring purchasing")}{stat("Components Required",selectedProjectLines.reduce((s,x)=>s+Number(x.quantity),0),Boxes,"Total units for this build")}</div></section><section className="panel"><h3>Purchasing / Shortage List</h3>{bomShortages.map(line=><div className="row" key={line.id}><span>{line.part.mpn} — {line.part.name}</span><span className="pill low">Order {line.quantity-line.part.stock}</span></div>)}{!bomShortages.length && <div className="empty">No component shortages for this BOM.</div>}</section></>}</>;
  const renderPinout = () => <>{heading("Pinout Inspector", "Searchable reference pin lists for common development boards.")}<section className="panel"><div className="toolbar"><select className="field" value={device} onChange={e=>setDevice(e.target.value)}><option>ESP32 DevKit V1</option><option>ATmega328P DIP-28</option></select><input className="field" placeholder="Search pin name or GPIO..." value={pinQuery} onChange={e=>setPinQuery(e.target.value)}/></div><div className="pins">{pinNames.map((name,index)=>({ name,index })).filter(pin=>pin.name.toLowerCase().includes(pinQuery.toLowerCase())).map(pin=><div className="pin" key={pin.index}><b>Pin {pin.index+1} · {pin.name}</b><span className="muted">{device==="ESP32 DevKit V1" ? "Board pin reference" : "ATmega328P DIP pin"}</span></div>)}</div></section></>;
  const renderAnalytics = () => {
    const byCategory = categories.map(name=>({ name, count: inventory.filter(part=>part.category===name).reduce((sum,part)=>sum+Number(part.stock||0),0) })).filter(x=>x.count);
    const totalBomCost = projects.reduce((sum,p)=>sum+(p.items||[]).reduce((s,line)=>{const part=inventory.find(x=>x.id===line.partId);return s+(part?Number(line.quantity)*Number(part.unitPrice):0);},0),0);
    return <>{heading("Inventory Analytics", "Stock valuation, category distribution, and project requirements.", <button className="btn alt" onClick={()=>downloadText("inventory-report.csv", [["MPN","Name","Category","Stock","Minimum","Unit Price","Stock Value"].join(","), ...inventory.map(p=>[p.mpn,p.name,p.category,p.stock,p.minStock,p.unitPrice,p.stock*p.unitPrice].map(csvCell).join(","))].join("\n"), "text/csv") }><FileDown size={14}/> Export Report</button>)}<div className="stats">{stat("Inventory Value",money(value,db.settings.currency),Wallet)}{stat("Stock Units",units,Boxes)}{stat("Low / Out of Stock",low.length,AlertTriangle)}{stat("Projects",projects.length,FileSpreadsheet)}</div><section className="panel"><h3>Stock by Category</h3>{byCategory.map(item=><div className="row" key={item.name}><span>{item.name}</span><span>{item.count} units</span></div>)}{!byCategory.length && <div className="empty">Add inventory to see category analytics.</div>}</section><section className="panel"><h3>Inventory Valuation by Component</h3><div className="scroll"><table className="table"><thead><tr><th>Component</th><th>Quantity</th><th>Unit Cost</th><th>Total Value</th></tr></thead><tbody>{inventory.slice().sort((a,b)=>(b.stock*b.unitPrice)-(a.stock*a.unitPrice)).map(part=><tr key={part.id}><td>{part.mpn} · {part.name}</td><td>{part.stock}</td><td>{money(part.unitPrice,db.settings.currency)}</td><td>{money(part.stock*part.unitPrice,db.settings.currency)}</td></tr>)}</tbody></table></div></section><section className="panel"><h3>Project BOM Cost Overview</h3>{projects.map(p=>{const cost=(p.items||[]).reduce((s,line)=>{const part=inventory.find(x=>x.id===line.partId);return s+(part?line.quantity*part.unitPrice:0);},0);return <div className="row" key={p.id}><span>{p.name}</span><b>{money(cost,db.settings.currency)}</b></div>;})}{!projects.length && <div className="empty">Create a project to view BOM cost analysis.</div>}<p className="muted">Combined estimated BOM cost: {money(totalBomCost,db.settings.currency)}</p></section></>;
  };
  const renderSettings = () => <>{heading("Settings", "Manage your profile, preferences, and local data backups.")}<section className="panel"><h3>Administrator Profile</h3><form className="form" onSubmit={e=>{e.preventDefault();alert("Profile saved.");}}><label>Name<input value={db.profile.name} onChange={e=>update({ profile:{ ...db.profile, name:e.target.value } })}/></label><label>Email<input type="email" value={db.profile.email} onChange={e=>update({ profile:{ ...db.profile, email:e.target.value } })}/></label><div className="wide"><button className="btn"><Save size={14}/> Save Profile</button></div></form></section><section className="panel"><h3>Preferences</h3><label>Display Currency<select className="field" value={db.settings.currency} onChange={e=>update({ settings:{ ...db.settings, currency:e.target.value } })}>{["PHP","USD","EUR","JPY","SGD","GBP","AUD"].map(x=><option key={x}>{x}</option>)}</select></label><p className="muted">Currency changes the display format only. Existing unit prices are not converted. Enter prices in your selected currency.</p><label><input type="checkbox" checked={db.settings.lowStockAlerts} onChange={e=>update({ settings:{ ...db.settings, lowStockAlerts:e.target.checked } })}/> Enable low-stock alerts on dashboard</label></section><section className="panel"><h3>Data Backup and Restore</h3><div className="toolbar"><button className="btn" onClick={backup}><Download size={14}/> Export JSON Backup</button><button className="btn alt" onClick={()=>restoreRef.current?.click()}><Upload size={14}/> Restore JSON Backup</button><input ref={restoreRef} hidden type="file" accept="application/json,.json" onChange={restoreBackup}/></div>{restoreMessage && <p className="muted">{restoreMessage}</p>}<p className="muted">Your data is stored locally in this browser. Export backups regularly. Restoring a backup replaces the current workspace.</p></section><section className="panel"><h3>Workspace Information</h3><div className="row"><span>Inventory records</span><b>{inventory.length}</b></div><div className="row"><span>Projects</span><b>{projects.length}</b></div><div className="row"><span>Stock movements</span><b>{movements.length}</b></div><button className="btn alt" onClick={()=>{if(confirm("Clear all local workspace data? Export a backup first. This cannot be undone.")){setDb(initial);localStorage.removeItem(STORE_KEY);resetPartForm();}}}><RotateCcw size={14}/> Reset Workspace</button></section></>;
  const body = page === "Dashboard" ? renderDashboard() : page === "Inventory" ? renderInventory() : page === "BOM Manager" ? renderBom() : page === "Pinout Inspector" ? renderPinout() : page === "Analytics" ? renderAnalytics() : renderSettings();
  if (cloudLoading) return <main className="auth-shell"><section className="auth-card"><h2>Loading your workspace…</h2><p>Connecting to your organization cloud inventory.</p></section></main>;
  if (cloudError) return <main className="auth-shell"><section className="auth-card"><h2>Unable to load workspace</h2><p className="auth-alert error">{cloudError}</p><button className="auth-submit" onClick={onSignOut}>Sign out</button></section></main>;
  return <div className="shell"><aside className="side"><div className="brand"><div className="mark">PCB</div><div><b>PCB Manager</b><small style={{ display:"block" }}>Component workspace</small></div></div><nav className="nav">{nav.map(([name,Icon])=><button key={name} className={page===name?"active":""} onClick={()=>setPage(name)}><Icon size={17}/>{name}</button>)}</nav><small>PCB Component BOM & Inventory Manager<br/>Supabase cloud · {role}</small></aside><div className="main"><header className="top"><h1>{page}</h1><div className="user"><div className="avatar">{(db.profile.name||"A").slice(0,2).toUpperCase()}</div><b>{db.profile.name}</b><button className="btn alt" onClick={onSignOut}>Sign out</button></div></header><main className="content">{body}</main><footer className="footer"><span>PCB Component BOM & Inventory Manager · Cloud workspace</span><span>{organization.name} · {role} · Antonio Miguel L. Lacanlale · BSCPE 3A</span></footer></div></div>;
}

}

export default function App() {
  const [session, setSession] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data?.session || null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setOrganization(null); setRole(""); setError(""); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setOrganization(null); setRole(""); return; }
    let active = true;
    getUserWorkspace(session.user).then(result => {
      if (active) { setOrganization(result.organization); setRole(result.role); setError(""); }
    }).catch(err => { if (active) setError(err.message || "Unable to find your workspace."); });
    return () => { active = false; };
  }, [session]);

  async function handleSignOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  }

  if (!isSupabaseConfigured) return <main className="auth-shell"><section className="auth-card"><h1>Supabase setup required</h1><p>Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env.local file and Vercel environment variables, then redeploy.</p></section></main>;
  if (loading) return <main className="auth-shell"><section className="auth-card"><h2>Checking your session…</h2></section></main>;
  if (!session) return <AuthScreen/>;
  if (error && !organization) return <main className="auth-shell"><section className="auth-card"><h2>Workspace unavailable</h2><p className="auth-alert error">{error}</p><button className="auth-submit" onClick={handleSignOut}>Sign out</button></section></main>;
  if (!organization) return <main className="auth-shell"><section className="auth-card"><h2>Preparing your workspace…</h2></section></main>;
  return <WorkspaceApp user={session.user} organization={organization} role={role} onSignOut={handleSignOut}/>;
}
