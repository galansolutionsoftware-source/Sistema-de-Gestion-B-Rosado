import type { IAccountPayableRepository } from '../../repositories';
import type { SupplierPaymentSummary } from '../../entities/AccountPayable';

export interface WeeklyPaymentSchedule {
  weekStart: Date;
  weekEnd: Date;
  supplierSummaries: SupplierPaymentSummary[];
  totalCurrentWeek: number;
  totalOverdueBalances: number;
  grandTotal: number;
}

export class ScheduleWeeklyPaymentsUseCase {
  private accountPayableRepository: IAccountPayableRepository;

  constructor(accountPayableRepository: IAccountPayableRepository) {
    this.accountPayableRepository = accountPayableRepository;
  }

  async execute(clientId: string, referenceDate: Date = new Date()): Promise<WeeklyPaymentSchedule> {
    const dayOfWeek = referenceDate.getDay();
    const weekStart = new Date(referenceDate);
    weekStart.setDate(referenceDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    await this.accountPayableRepository.carryOverdueBalances(clientId);
    const summaries = await this.accountPayableRepository.getWeeklyPaymentSummary(clientId, weekStart, weekEnd);

    let totalCurrentWeek = 0;
    let totalOverdueBalances = 0;
    for (const supplier of summaries) {
      totalCurrentWeek += supplier.valor_semana_actual;
      totalOverdueBalances += supplier.valor_semanas_anteriores;
    }

    return {
      weekStart,
      weekEnd,
      supplierSummaries: summaries,
      grandTotal: totalCurrentWeek + totalOverdueBalances,
      totalCurrentWeek,
      totalOverdueBalances,
    };
  }
}
