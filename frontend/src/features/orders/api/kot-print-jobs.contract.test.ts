import {
  parseKotPrintJob,
  parseKotPrintJobs,
  parseKotPrintRequest,
} from './kot-print-jobs.contract';

const id = '11111111-1111-4111-8111-111111111111';
const row = {
  kotId: '22222222-2222-4222-8222-222222222222',
  orderId: id,
  printStatus: 'PENDING',
  printedAt: null,
  isCancelled: false,
  printerName: null,
  reprintedAt: null,
  createdAt: '2026-11-08T04:00:00.000Z',
  updatedAt: '2026-11-08T04:00:00.000Z',
};

describe('DDP-265 KOT print-job response contracts', () => {
  it('parses a valid pending record and deduplicated request', () => {
    expect(parseKotPrintRequest({ created: false, job: row }, id)).toMatchObject({
      created: false,
      job: { printStatus: 'PENDING' },
    });
  });

  it('rejects fabricated printed status without timestamp', () => {
    expect(() => parseKotPrintJob({ ...row, printStatus: 'PRINTED' })).toThrow();
  });

  it('rejects a job from a different order', () => {
    expect(() => parseKotPrintJobs([row], '33333333-3333-4333-8333-333333333333')).toThrow();
  });

  it('rejects inconsistent cancellation and invalid statuses', () => {
    expect(() => parseKotPrintJob({ ...row, isCancelled: true })).toThrow();
    expect(() => parseKotPrintJob({ ...row, printStatus: 'SUCCESS' })).toThrow();
  });

  it('accepts real confirmed printed records only with timestamps', () => {
    expect(
      parseKotPrintJob({ ...row, printStatus: 'PRINTED', printedAt: row.createdAt }).printStatus,
    ).toBe('PRINTED');
  });
});
