import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const API_BASE = process.env.API_BASE || "http://127.0.0.1:3000";

async function http(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}

  return { status: res.status, text, json };
}

async function main() {
  const email = process.env.DEV_EMAIL!;
  const password = process.env.DEV_PASSWORD!;

  if (!email || !password) {
    throw new Error("Set DEV_EMAIL and DEV_PASSWORD in .env");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const token = data.session?.access_token;
  if (!token) throw new Error("No access_token returned");

  console.log("✅ Logged in. Token acquired.");
  console.log("\n🔐 TOKEN:");
console.log(token);


  // ───────────────── ME ─────────────────
  const me = await http("/me", token);
  console.log("\nGET /me:", me.status);
  console.log(me.text);

  // ─────────────── TENANTS ───────────────
  const tenants = await http("/tenants", token);
  console.log("\nGET /tenants:", tenants.status);
  console.log(tenants.text);

  // ─────────────── SUPPLIER ───────────────
  const supplierPayload = {
    type: "PJ",
    legal_name: "Mario Salviato Genética LTDA",
    trade_name: "Mario Salviato Genética",
    document: "12.345.678/0001-90",
    state_registration: null,
    notes: "Fornecedor de ovos férteis e matrizes.",
  };

  const supplierRes = await http("/suppliers", token, {
    method: "POST",
    body: JSON.stringify(supplierPayload),
  });

  console.log("\nPOST /suppliers:", supplierRes.status);
  console.log(supplierRes.text);

  const supplierId = supplierRes.json?.supplier?.id;
  if (!supplierId) throw new Error("supplierId not found");

  // endereço (não-idempotente ainda; ok para dev)
  const addrRes = await http(`/suppliers/${supplierId}/address`, token, {
    method: "POST",
    body: JSON.stringify({
      zip_code: "75700-000",
      street: "Rua do Cerrado",
      number: "123",
      complement: "Galpão 2",
      district: "Zona Rural",
      city: "Orizona",
      state: "GO",
    }),
  });
  console.log("\nPOST /suppliers/:id/address:", addrRes.status);
  console.log(addrRes.text);

  // contato (não-idempotente ainda; ok para dev)
  const contactRes = await http(`/suppliers/${supplierId}/contacts`, token, {
    method: "POST",
    body: JSON.stringify({
      name: "Contato Principal",
      phone: "+55 64 99999-9999",
      email: "contato@mariosalviato.com",
      role: "Comercial",
    }),
  });
  console.log("\nPOST /suppliers/:id/contacts:", contactRes.status);
  console.log(contactRes.text);

  console.log("✅ Supplier completo.");

  // ─────────────── LOCATION ───────────────
const locationRes = await http("/locations", token, {
  method: "POST",
  body: JSON.stringify({
    name: "Galpão 01",
    type: "GALPAO", // ✅ era kind, agora é type
    notes: "Postura / matrizes",
  }),
});


  console.log("\nPOST /locations:", locationRes.status);
  console.log(locationRes.text);

  const locationId = locationRes.json?.location?.id ?? locationRes.json?.id;

  console.log("✅ Location OK.");

  // ───────────────── LOT ─────────────────
const lotPayload = {
  code: "LOT-IG-001",
  lot_type: "MATRIZES", // ✅ enum correto
  name: "Lote 01 - Matrizes",
  species: "CHICKEN",
  purpose: "MATRIZES",
  breed: "Índio Gigante",
  start_date: "2026-01-03",
  status: "ACTIVE",
  supplier_id: supplierId,
  location_id: locationId,
  notes: "Origem: Mario Salviato. Controle de ovos e eclosão.",
};

const lotRes = await http("/lots", token, {
  method: "POST",
  body: JSON.stringify(lotPayload),
});

console.log("\nPOST /lots:", lotRes.status);
console.log(lotRes.text);

const lotId = lotRes.json?.lot?.id ?? lotRes.json?.id;

// ✅ se não criou/retornou lotId, para aqui pra não quebrar o resto
if (!lotId) {
  console.log("\n❌ Não consegui obter lotId (verifique o erro acima).");
  return;
}

// daqui pra baixo só roda se lotId existir
const lotList = await http("/lots", token);
console.log("\nGET /lots:", lotList.status);
console.log(lotList.text);

const lotOne = await http(`/lots/${lotId}`, token);
console.log("\nGET /lots/:id:", lotOne.status);
console.log(lotOne.text);

  // ─────────────── MOVEMENTS ───────────────
// 1) Entrada inicial (compra/entrada)
const mvIn = await http("/movements", token, {
  method: "POST",
  body: JSON.stringify({
    lot_id: lotId,
    movement_type: "ENTRY_PURCHASE", // ✅ enum correto
    species: "CHICKEN",              // ✅ obrigatório no DB
    qty: 20,
    movement_date: "2026-01-03",
    to_location_id: locationId,
    notes: "Entrada inicial do lote (compra/entrada).",
  }),
});
console.log("\nPOST /movements (ENTRY_PURCHASE):", mvIn.status);
console.log(mvIn.text);

// 2) Morte
const mvDeath = await http("/movements", token, {
  method: "POST",
  body: JSON.stringify({
    lot_id: lotId,
    movement_type: "DEATH", // ✅ enum correto
    species: "CHICKEN",     // ✅ obrigatório no DB
    qty: 1,
    movement_date: "2026-01-03",
    from_location_id: locationId,
    notes: "Morte (teste).",
  }),
});
console.log("\nPOST /movements (DEATH):", mvDeath.status);
console.log(mvDeath.text);

  // 3) Listar movimentações do lote
  const mvList = await http(`/lots/${lotId}/movements`, token);
  console.log("\nGET /lots/:lotId/movements:", mvList.status);
  console.log(mvList.text);

  // 4) Saldo do lote
  const bal = await http(`/lots/${lotId}/balance`, token);
  console.log("\nGET /lots/:lotId/balance:", bal.status);
  console.log(bal.text);

  console.log("\n🐄🥚📊✅ Fluxo Movements OK.");

  // ─────────────── DASHBOARD ───────────────
  const dash = await http("/dashboard/overview", token);
  console.log("\nGET /dashboard/overview:", dash.status);
  console.log(JSON.stringify(dash.json, null, 2));
}

main().catch((e) => {
  console.error("❌ Error:", e?.message || e);
  process.exit(1);
});
