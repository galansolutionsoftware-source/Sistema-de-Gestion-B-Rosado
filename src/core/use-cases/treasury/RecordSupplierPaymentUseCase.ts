import type { IAccountPayableRepository } from '../../repositories';

export class RecordSupplierPaymentUseCase {
  private accountPayableRepository: IAccountPayableRepository;

  constructor(accountPayableRepository: IAccountPayableRepository) {
    this.accountPayableRepository = accountPayableRepository;
  }

  async execute(accountId: string): Promise<void> {
    await this.accountPayableRepository.markAsPaid(accountId);
  }
}
