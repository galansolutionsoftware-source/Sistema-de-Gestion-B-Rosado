// ============================================================
// HOOK: useTreasury
// React Query wrapper for accounts payable and payment scheduling
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseAccountPayableRepository } from '../../infra/repositories/SupabaseAccountPayableRepository';
import { ScheduleWeeklyPaymentsUseCase } from '../../core/use-cases/treasury/ScheduleWeeklyPaymentsUseCase';
import { RecordSupplierPaymentUseCase } from '../../core/use-cases/treasury/RecordSupplierPaymentUseCase';

const accountPayableRepo = new SupabaseAccountPayableRepository();
const schedulePaymentsUseCase = new ScheduleWeeklyPaymentsUseCase(accountPayableRepo);
const recordPaymentUseCase = new RecordSupplierPaymentUseCase(accountPayableRepo);

export const useTreasury = (clientId: string, referenceDate?: Date) => {
  const queryClient = useQueryClient();

  const { data: weeklySchedule, isLoading } = useQuery({
    queryKey: ['weeklyPaymentSchedule', clientId, referenceDate?.toISOString()],
    queryFn: () => schedulePaymentsUseCase.execute(clientId, referenceDate),
    enabled: !!clientId,
  });

  const { data: overdueAccounts } = useQuery({
    queryKey: ['overdueAccounts', clientId],
    queryFn: () => accountPayableRepo.findOverdue(clientId),
    enabled: !!clientId,
  });

  const payMutation = useMutation({
    mutationFn: (accountId: string) => recordPaymentUseCase.execute(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPaymentSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['overdueAccounts'] });
    },
  });

  return {
    weeklySchedule,
    overdueAccounts,
    isLoading,
    recordPayment: payMutation.mutate,
    isRecordingPayment: payMutation.isPending,
  };
};
