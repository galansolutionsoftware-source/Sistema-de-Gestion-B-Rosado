// ============================================================
// HOOK: usePlanning
// React Query wrapper for menu planning operations
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseMenuPlanningRepository } from '../../infra/repositories/SupabaseMenuPlanningRepository';
import { SupabaseInventoryRepository } from '../../infra/repositories/SupabaseInventoryRepository';
import { ExplodeIngredientsUseCase } from '../../core/use-cases/planning/ExplodeIngredientsUseCase';
import type { CreateMenuPlanningDTO } from '../../core/entities/MenuPlanning';

const planningRepo = new SupabaseMenuPlanningRepository();
const inventoryRepo = new SupabaseInventoryRepository();
const explodeUseCase = new ExplodeIngredientsUseCase(planningRepo, inventoryRepo);

export const usePlanning = (clientId: string, startDate: Date, endDate: Date) => {
  const queryClient = useQueryClient();

  const { data: plannings, isLoading: planningsLoading } = useQuery({
    queryKey: ['plannings', clientId, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => planningRepo.findByDateRange(clientId, startDate, endDate),
    enabled: !!clientId,
  });

  const { data: ingredientExplosion, isLoading: explosionLoading } = useQuery({
    queryKey: ['ingredientExplosion', clientId, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => explodeUseCase.execute(clientId, startDate, endDate),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateMenuPlanningDTO) => planningRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannings'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientExplosion'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => planningRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannings'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientExplosion'] });
    },
  });

  return {
    plannings,
    ingredientExplosion,
    isLoading: planningsLoading || explosionLoading,
    createPlanning: createMutation.mutateAsync,
    deletePlanning: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
};
