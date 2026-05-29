import type { IRecipeSheetRepository, IIngredientRepository } from '../../repositories';

export class UpdateCostsCascadeUseCase {
  private recipeSheetRepository: IRecipeSheetRepository;
  private ingredientRepository: IIngredientRepository;

  constructor(
    recipeSheetRepository: IRecipeSheetRepository,
    ingredientRepository: IIngredientRepository,
  ) {
    this.recipeSheetRepository = recipeSheetRepository;
    this.ingredientRepository = ingredientRepository;
  }

  async executeOnIngredientPriceChange(ingredientId: string, newPrice: number): Promise<void> {
    await this.ingredientRepository.updatePrice(ingredientId, newPrice);
    const allRecipes = await this.recipeSheetRepository.findAll();
    const affectedRecipes = allRecipes.filter((recipe) =>
      recipe.detalles.some((detail) => detail.insumo_id === ingredientId),
    );
    for (const recipe of affectedRecipes) {
      await this.recipeSheetRepository.calculateTotalCost(recipe.id);
      await this.recipeSheetRepository.update(recipe.id, {
        nombre_plato: recipe.nombre_plato,
        cliente_id: recipe.cliente_id,
        detalles: recipe.detalles.map((d) => ({
          insumo_id: d.insumo_id,
          gramaje_neto_por_racion: d.gramaje_neto_por_racion,
        })),
      });
    }
  }
}
