import type { IMenuPlanningRepository, IInventoryRepository } from '../../repositories';
import type { IngredientExplosionResult } from '../../entities/MenuPlanning';

export class ExplodeIngredientsUseCase {
  private planningRepository: IMenuPlanningRepository;
  private inventoryRepository: IInventoryRepository;

  constructor(
    planningRepository: IMenuPlanningRepository,
    inventoryRepository: IInventoryRepository,
  ) {
    this.planningRepository = planningRepository;
    this.inventoryRepository = inventoryRepository;
  }

  async execute(clientId: string, startDate: Date, endDate: Date): Promise<IngredientExplosionResult[]> {
    const explosion = await this.planningRepository.explodeIngredients(clientId, startDate, endDate);
    const currentStock = await this.inventoryRepository.getAllStock(clientId);
    const stockMap = new Map<string, number>();
    currentStock.forEach((stock) => { stockMap.set(stock.insumo_id, stock.stock_actual); });
    return explosion.map((item) => ({
      ...item,
      stock_disponible: stockMap.get(item.insumo_id) ?? 0,
      necesidad_compra: Math.max(0, item.cantidad_total - (stockMap.get(item.insumo_id) ?? 0)),
    }));
  }
}
