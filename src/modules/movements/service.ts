import { supabaseAdmin } from "../../config/supabase";

type MovementType =
  | "ENTRY_PURCHASE"
  | "SALE"
  | "DEATH"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "BIRTH"
  | "CULL";

export class MovementsService {
  private admin = supabaseAdmin();

  async listByLot(tenantId: string, lotId: string) {
    const { data, error } = await this.admin
      .from("movements")
      .select(
        `
        id, tenant_id, lot_id, species, movement_type, qty, movement_date, notes,
        from_location_id, to_location_id,
        created_at, updated_at
      `
      )
      .eq("tenant_id", tenantId)
      .eq("lot_id", lotId)
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async create(
    tenantId: string,
    input: {
      lot_id: string;
      movement_type: MovementType;
      species: string;
      qty: number;
      movement_date: string; // YYYY-MM-DD
      from_location_id?: string | null;
      to_location_id?: string | null;
      notes?: string | null;
    }
  ) {
    if (input.qty <= 0) {
      const err: any = new Error("qty must be > 0");
      err.statusCode = 400;
      throw err;
    }

    // Regras mínimas de transferência (opcional mas ajuda)
    if (input.movement_type === "TRANSFER_IN" && !input.to_location_id) {
      const err: any = new Error("TRANSFER_IN requires to_location_id");
      err.statusCode = 400;
      throw err;
    }
    if (input.movement_type === "TRANSFER_OUT" && !input.from_location_id) {
      const err: any = new Error("TRANSFER_OUT requires from_location_id");
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await this.admin
      .from("movements")
      .insert({
        tenant_id: tenantId,
        lot_id: input.lot_id,
        species: input.species,
        movement_type: input.movement_type,
        qty: input.qty,
        movement_date: input.movement_date,
        from_location_id: input.from_location_id ?? null,
        to_location_id: input.to_location_id ?? null,
        notes: input.notes ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async getLotBalance(tenantId: string, lotId: string) {
    const { data, error } = await this.admin
      .from("movements")
      .select("movement_type, qty")
      .eq("tenant_id", tenantId)
      .eq("lot_id", lotId);

    if (error) throw error;

    let balance = 0;
    for (const row of data ?? []) {
      const t = row.movement_type as MovementType;
      const q = Number(row.qty || 0);

      // Entradas / nascimentos / transfer_in somam
      if (t === "ENTRY_PURCHASE" || t === "BIRTH" || t === "TRANSFER_IN") balance += q;

      // Saídas / morte / descarte / transfer_out subtraem
      if (t === "SALE" || t === "DEATH" || t === "CULL" || t === "TRANSFER_OUT") balance -= q;
    }

    return { lotId, balance };
  }

  async delete(tenantId: string, movementId: string) {
    const { error } = await this.admin
      .from("movements")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", movementId);

    if (error) throw error;
    return { ok: true };
  }
}
