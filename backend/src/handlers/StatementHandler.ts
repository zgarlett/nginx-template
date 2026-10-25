import type { Request, Response } from 'express';
import type { FieldPacket, QueryResult, ResultSetHeader } from 'mysql2/promise';
import { DatabaseHelper } from '../helpers/DatabaseHelper.js';
type StatementImport = {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
};

const columnDictionary: Record<string, string> = {
  'Transaction Date': 'transaction_date',
  'Post Date': 'post_date',
  'Description': 'description',
  'Category': 'category',
  'Type': 'type',
  'Amount': 'amount',
  'Memo': 'memo'
};

function parseImport(body: unknown): StatementImport {
  if (!body || typeof body !== 'object') throw new Error('Error');
  const values = body as Record<string, unknown>;
  if (typeof values.filename !== 'string' || values.filename.trim().length === 0) throw new Error('Error');
  if (!Array.isArray(values.headers) || values.headers.length === 0) throw new Error('Error');
  if (!values.headers.every((header) => typeof header === 'string' && header.trim().length > 0)) throw new Error('Error');
  if (new Set((values.headers as string[]).map((header) => header.toLowerCase())).size !== values.headers.length) throw new Error('Error');
  if (!Array.isArray(values.rows) || values.rows.length === 0) throw new Error('Error');

  const headers = values.headers as string[];
  const rows = values.rows as unknown[];
  if (!rows.every((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const record = row as Record<string, unknown>;
    return Object.keys(record).length === headers.length
      && headers.every((header) => typeof record[header] === 'string');
  })) throw new Error('Error');

  return { filename: values.filename.trim(), headers, rows: rows as Record<string, string>[] };
}

function createDateString(date: string): string {
  return `STR_TO_DATE('${date}', '%m/%d/%Y')`;
};

function createSqlInsertStatement(filename: string, headers: string[], row: Record<string, string>): string {
    const columns = headers.map((item) => columnDictionary[item]).join(',');
    const values = Object.keys(row).map((item) => item === "Transaction Date" || item === "Post Date" ? createDateString(row[item]) : item != "Amount" ? `"${row[item]}"` : Number(row[item])).join(',');
    return `INSERT INTO chase_transactions (${columns}, filename) values (${values},"${filename}");`;
}

async function batch(filename: string, headers: string[], rows: Record<string, string>[], database: DatabaseHelper): Promise<[QueryResult, FieldPacket[]][]> {
    const promises = [];
    for(const row of rows){
        promises.push(database.execute(createSqlInsertStatement(filename, headers, row)));
    }
    return Promise.all(promises);
};
export class StatementHandler {
  public async import(req: Request, res: Response): Promise<void> {
    const { filename, headers, rows } = parseImport(req.body);
    const database = new DatabaseHelper();
    const results = await batch(filename, headers, rows, database);

    if (!results ) {
      res.status(400).json({ error: 'Provide a filename, unique headers, and rows matching those headers.' });
      return;
    }

    res.status(202).json({ results  });
  }

  public async getFileNames(req: Request, res: Response): Promise<void> {
    const database = new DatabaseHelper();
    const [results] = await database.execute('SELECT DISTINCT filename FROM chase_transactions;');
    res.status(200).json({ results });
  }

  public async deleteFiles(req: Request, res: Response): Promise<void> {
    const body: unknown = req.body;
    const filenames = body && typeof body === 'object' && 'filenames' in body
      ? body.filenames
      : undefined;
    if (
      !Array.isArray(filenames)
      || filenames.length === 0
      || !filenames.every((filename): filename is string => typeof filename === 'string' && filename.trim().length > 0)
    ) {
      res.status(400).json({ message: 'Provide one or more valid filenames to delete.' });
      return;
    }

    const uniqueFilenames = [...new Set(filenames.map((filename) => filename.trim()))];
    const database = new DatabaseHelper();
    const placeholders = uniqueFilenames.map(() => '?').join(', ');
    const [results] = await database.execute(
      `DELETE FROM chase_transactions WHERE filename IN (${placeholders});`,
      uniqueFilenames,
    );
    const deletedRows = (results as ResultSetHeader).affectedRows;

    if (deletedRows === 0) {
      res.status(404).json({ message: 'No records found for the selected filenames.' });
      return;
    }

    res.status(200).json({ deletedRows, filenames: uniqueFilenames });
  }
}