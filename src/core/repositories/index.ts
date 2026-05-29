// ============================================================
// REPOSITORY INTERFACES
// Port definitions (Clean Architecture)
// ============================================================

import type { Client, CreateClientDTO } from '../entities/Client';
import type { Supplier, CreateSupplierDTO } from '../entities/Supplier';
import type { Ingredient, CreateIngredientDTO } from '../entities/Ingredient';
import type { RecipeSheet, CreateRecipeSheetDTO } from '../entities/RecipeSheet';
import type { MenuPlanning, CreateMenuPlanningDTO, IngredientExplosionResult } from '../entities/MenuPlanning';
import type { PurchaseOrder, CreatePurchaseOrderDTO, OrderStatus } from '../entities/PurchaseOrder';
import type { Inventory, InventoryMovement } from '../entities/Inventory';
import type { AccountPayable, SupplierPaymentSummary } from '../entities/AccountPayable';

export interface IClientRepository {
  findAll(): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
  create(data: CreateClientDTO): Promise<Client>;
  update(id: string, data: Partial<CreateClientDTO>): Promise<Client>;
  delete(id: string): Promise<void>;
}

export interface ISupplierRepository {
  findAll(): Promise<Supplier[]>;
  findById(id: string): Promise<Supplier | null>;
  create(data: CreateSupplierDTO): Promise<Supplier>;
  update(id: string, data: Partial<CreateSupplierDTO>): Promise<Supplier>;
  delete(id: string): Promise<void>;
}

export interface IIngredientRepository {
  findAll(): Promise<Ingredient[]>;
  findById(id: string): Promise<Ingredient | null>;
  findByCategory(categoryId: string): Promise<Ingredient[]>;
  create(data: CreateIngredientDTO): Promise<Ingredient>;
  update(id: string, data: Partial<CreateIngredientDTO>): Promise<Ingredient>;
  updatePrice(id: string, newPrice: number): Promise<Ingredient>;
  delete(id: string): Promise<void>;
}

export interface IRecipeSheetRepository {
  findAll(clientId?: string): Promise<RecipeSheet[]>;
  findById(id: string): Promise<RecipeSheet | null>;
  create(data: CreateRecipeSheetDTO): Promise<RecipeSheet>;
  update(id: string, data: Partial<CreateRecipeSheetDTO>): Promise<RecipeSheet>;
  delete(id: string): Promise<void>;
  calculateTotalCost(recipeId: string): Promise<number>;
}

export interface IMenuPlanningRepository {
  findByDateRange(clientId: string, startDate: Date, endDate: Date): Promise<MenuPlanning[]>;
  create(data: CreateMenuPlanningDTO): Promise<MenuPlanning>;
  update(id: string, data: Partial<CreateMenuPlanningDTO>): Promise<MenuPlanning>;
  delete(id: string): Promise<void>;
  explodeIngredients(clientId: string, startDate: Date, endDate: Date): Promise<IngredientExplosionResult[]>;
}

export interface IPurchaseOrderRepository {
  findAll(clientId?: string): Promise<PurchaseOrder[]>;
  findById(id: string): Promise<PurchaseOrder | null>;
  create(data: CreatePurchaseOrderDTO): Promise<PurchaseOrder>;
  updateStatus(id: string, status: OrderStatus): Promise<PurchaseOrder>;
  delete(id: string): Promise<void>;
}

export interface IInventoryRepository {
  getStock(clientId: string, ingredientId: string): Promise<number>;
  getAllStock(clientId: string): Promise<Inventory[]>;
  registerEntry(clientId: string, ingredientId: string, quantity: number, referenceId: string): Promise<void>;
  registerExit(clientId: string, ingredientId: string, quantity: number, referenceId: string): Promise<void>;
  getMovements(clientId: string, startDate?: Date, endDate?: Date): Promise<InventoryMovement[]>;
}

export interface IAccountPayableRepository {
  findBySupplier(supplierId: string, clientId: string): Promise<AccountPayable[]>;
  findOverdue(clientId: string): Promise<AccountPayable[]>;
  findByDateRange(clientId: string, startDate: Date, endDate: Date): Promise<AccountPayable[]>;
  createFromOrder(purchaseOrderId: string): Promise<AccountPayable>;
  markAsPaid(id: string): Promise<void>;
  getWeeklyPaymentSummary(clientId: string, weekStart: Date, weekEnd: Date): Promise<SupplierPaymentSummary[]>;
  carryOverdueBalances(clientId: string): Promise<AccountPayable[]>;
}
