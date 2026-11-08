export type KotPrintStatus = 'PENDING' | 'PRINTED' | 'FAILED' | 'CANCELLED';

export interface KotPrintJob {
  kotId: string;
  orderId: string;
  printStatus: KotPrintStatus;
  printedAt: string | null;
  isCancelled: boolean;
  printerName: string | null;
  reprintedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KotPrintRequestResult {
  created: boolean;
  job: KotPrintJob;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isOptionalText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function parseKotPrintJob(value: unknown): KotPrintJob {
  if (
    !record(value) ||
    typeof value.kotId !== 'string' ||
    typeof value.orderId !== 'string' ||
    !['PENDING', 'PRINTED', 'FAILED', 'CANCELLED'].includes(String(value.printStatus)) ||
    typeof value.isCancelled !== 'boolean' ||
    value.isCancelled !== (value.printStatus === 'CANCELLED') ||
    !(value.printedAt === null || isTimestamp(value.printedAt)) ||
    !(value.reprintedAt === null || isTimestamp(value.reprintedAt)) ||
    !isOptionalText(value.printerName) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    (value.printStatus === 'PRINTED' && !isTimestamp(value.printedAt))
  ) {
    throw new Error('Invalid kitchen print-job response');
  }
  return value as unknown as KotPrintJob;
}

export function parseKotPrintJobs(value: unknown, orderId: string): KotPrintJob[] {
  if (!Array.isArray(value)) throw new Error('Invalid kitchen print-job history');
  const jobs = value.map(parseKotPrintJob);
  if (jobs.some((job) => job.orderId !== orderId)) {
    throw new Error('Unexpected print-job order reference');
  }
  return jobs;
}

export function parseKotPrintRequest(value: unknown, orderId: string): KotPrintRequestResult {
  if (!record(value) || typeof value.created !== 'boolean') {
    throw new Error('Invalid print request response');
  }
  const job = parseKotPrintJob(value.job);
  if (job.orderId !== orderId || job.printStatus !== 'PENDING') {
    throw new Error('Invalid pending print-job response');
  }
  return { created: value.created, job };
}
