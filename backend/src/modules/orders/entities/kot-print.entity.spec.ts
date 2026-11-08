import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';

import { KotPrint } from './kot-print.entity.js';
import { KotPrintStatus } from '../enums/kot-print-status.enum.js';

const metadata = getMetadataArgsStorage();

describe('DDP-108 approved KOT table mapping', () => {
  it('maps exactly to the existing public kms_kot_prints table', () => {
    const table = metadata.tables.find((item) => item.target === KotPrint);
    expect(table?.name).toBe('kms_kot_prints');
    const cols = metadata.columns.filter(
      (column) => column.target === KotPrint,
    );
    expect(cols.map((column) => column.options.name).sort()).toEqual(
      [
        'kot_id',
        'order_id',
        'print_status',
        'printed_at',
        'is_cancelled',
        'printer_name',
        'reprinted_at',
        'created_at',
        'updated_at',
      ].sort(),
    );
    const status = cols.find(
      (column) => column.options.name === 'print_status',
    );
    expect(status?.options.enumName).toBe('kot_print_status');
    expect(status?.options.enum).toEqual(KotPrintStatus);
  });

  it('matches the approved enum and foreign-key delete restriction', () => {
    expect(Object.values(KotPrintStatus)).toEqual([
      'PENDING',
      'PRINTED',
      'FAILED',
      'CANCELLED',
    ]);
    const relation = metadata.relations.find(
      (item) => item.target === KotPrint,
    );
    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options.onDelete).toBe('RESTRICT');
    expect(
      metadata.joinColumns.find((item) => item.target === KotPrint)?.name,
    ).toBe('order_id');
  });

  it('maps printed timestamp as nullable and cancellation as false by default', () => {
    const cols = metadata.columns.filter(
      (column) => column.target === KotPrint,
    );
    expect(
      cols.find((column) => column.options.name === 'printed_at')?.options
        .nullable,
    ).toBe(true);
    expect(
      cols.find((column) => column.options.name === 'is_cancelled')?.options
        .default,
    ).toBe(false);
    expect(
      cols.find((column) => column.options.name === 'print_status')?.options
        .default,
    ).toBe('PENDING');
  });
});
