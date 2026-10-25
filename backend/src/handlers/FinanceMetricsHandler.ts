import type { Request, Response } from 'express';
import { DatabaseHelper } from '../helpers/DatabaseHelper.js';
import { financeQueries } from '../sql/finance_queries.js';

type MetricRow = Record<string, unknown>;

async function queryRows(database: DatabaseHelper, sql: string): Promise<MetricRow[]> {
  const [result] = await database.execute(sql);
  if (!Array.isArray(result)) {
    throw new Error('Finance metric query did not return rows.');
  }
  return result as MetricRow[];
}

export class FinanceMetricsHandler {
  public async getMetrics(_req: Request, res: Response): Promise<void> {
    const database = new DatabaseHelper();
    const [tableRows] = await database.execute(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name = 'finance_budgets';`,
    );
    const hasBudgetTable = Array.isArray(tableRows) && tableRows.length > 0;

    const entries = Object.entries(financeQueries).filter(([name]) => name !== 'budgetVsActual');
    const resultEntries = await Promise.all(
      entries.map(async ([name, sql]) => [name, await queryRows(database, sql)] as const),
    );
    const metrics: Record<string, MetricRow[]> = Object.fromEntries(resultEntries);
    const unavailable: Record<string, string> = {};

    if (hasBudgetTable) {
      metrics.budgetVsActual = await queryRows(database, financeQueries.budgetVsActual);
    } else {
      metrics.budgetVsActual = [];
      unavailable.budgetVsActual = 'Budget metrics require the finance_budgets table.';
    }

    res.status(200).json({ metrics, unavailable });
  }
}
