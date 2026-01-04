import { supabaseAdmin } from "../../config/supabase";

export class DashboardService {
  private admin = supabaseAdmin();

  async overview(tenantId: string) {
    // 1) Buscar lotes ativos
    const { data: lots, error: lotsError } = await this.admin
      .from("lots")
      .select(
        `
        id, name, species, purpose, status,
        location:locations(id, name),
        supplier:suppliers(id, trade_name)
      `
      )
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE");

    if (lotsError) throw lotsError;

    const lotIds = (lots ?? []).map((l) => l.id);

    // 2) Buscar movimentações recentes (últimos 7 dias)
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data: movements, error: mvError } = await this.admin
      .from("movements")
      .select(
        `
        id, lot_id, movement_type, qty, movement_date, notes,
        lot:lots(id, name)
      `
      )
      .eq("tenant_id", tenantId)
      .gte("movement_date", since.toISOString().slice(0, 10))
      .order("movement_date", { ascending: false })
      .limit(50);

    if (mvError) throw mvError;

    // 3) Calcular saldo por lote
    const balances: Record<string, number> = {};

    if (lotIds.length > 0) {
      const { data: allMovements, error } = await this.admin
        .from("movements")
        .select("lot_id, movement_type, qty")
        .eq("tenant_id", tenantId)
        .in("lot_id", lotIds);

      if (error) throw error;

      for (const mv of allMovements ?? []) {
        const lotId = mv.lot_id;
        if (!balances[lotId]) balances[lotId] = 0;

        if (mv.movement_type === "IN" || mv.movement_type === "BIRTH") {
          balances[lotId] += mv.qty;
        }

        if (mv.movement_type === "OUT" || mv.movement_type === "DEATH") {
          balances[lotId] -= mv.qty;
        }
      }
    }

    // 4) Totais por espécie
    const totalsBySpecies: Record<string, number> = {};

    for (const lot of lots ?? []) {
      const balance = balances[lot.id] ?? 0;
      if (!totalsBySpecies[lot.species]) totalsBySpecies[lot.species] = 0;
      totalsBySpecies[lot.species] += balance;
    }

    return {
      summary: {
        totalLots: lots?.length ?? 0,
        totalsBySpecies,
      },
      lots: (lots ?? []).map((lot) => ({
        ...lot,
        balance: balances[lot.id] ?? 0,
      })),
      recentMovements: movements ?? [],
    };
  }
}
