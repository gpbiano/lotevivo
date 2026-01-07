import type { FastifyInstance } from "fastify";

type Auth = { activeTenantId: string };

type InventoryBalanceViewRow = {
  tenant_id: string;
  item_id: string; // na tua view é item_id
  location_id: string | null;
  balance: number; // na view aparece como "bala..." (numeric)
};

export function inventoryService(app: FastifyInstance) {
  const db = (app as any).supabase;

  if (!db) {
    throw new Error("Supabase não está configurado no backend (app.supabase).");
  }

  async function getBalance(auth: Auth, params: { groupBy?: "lot" | "lot_location" }) {
    const groupBy = params.groupBy ?? "lot";

    const { data, error } = await db
      .from("inventory_balance_view")
      .select("tenant_id, item_id, location_id, balance")
      .eq("tenant_id", auth.activeTenantId);

    if (error) throw error;

    const rows = (data ?? []) as InventoryBalanceViewRow[];

    // ✅ groupBy=lot → soma por item_id
    if (groupBy === "lot") {
      const map = new Map<string, number>();

      for (const r of rows) {
        const key = r.item_id;
        const v = Number(r.balance ?? 0);
        map.set(key, (map.get(key) ?? 0) + (Number.isFinite(v) ? v : 0));
      }

      const items = Array.from(map.entries()).map(([itemId, qty]) => ({
        // frontend quer lot_id:
        lot_id: itemId,
        qty,
      }));

      return { items };
    }

    // ✅ groupBy=lot_location → soma por item_id + location_id
    const map = new Map<string, number>();

    for (const r of rows) {
      const key = `${r.item_id}::${r.location_id ?? "null"}`;
      const v = Number(r.balance ?? 0);
      map.set(key, (map.get(key) ?? 0) + (Number.isFinite(v) ? v : 0));
    }

    const items = Array.from(map.entries()).map(([k, qty]) => {
      const [itemId, locationIdRaw] = k.split("::");
      const location_id = locationIdRaw === "null" ? null : locationIdRaw;

      return {
        lot_id: itemId,
        location_id,
        qty,
      };
    });

    return { items };
  }

  return { getBalance };
}
