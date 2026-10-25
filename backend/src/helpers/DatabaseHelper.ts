import 'dotenv/config';
import { createPool, type FieldPacket, type Pool, type QueryResult } from 'mysql2/promise';

export class DatabaseHelper {
    private static pool: Pool | undefined;

    public async execute(sql: string, values?: string[]): Promise<[QueryResult, FieldPacket[]]> {
        const pool = this.getPool();
        const connection = await pool.getConnection();
        try {
            return values ? await connection.execute(sql, values) : await connection.query(sql);
        } finally {
            connection.release();
        }
    }

    private getPool(): Pool {
        const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;
        if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
            throw new Error('MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE environment variables are required.');
        }

        if (!DatabaseHelper.pool) {
            const port = Number(MYSQL_PORT || 3306);
            if (!Number.isInteger(port) || port < 1 || port > 65535) {
                throw new Error('MYSQL_PORT must be a valid TCP port.');
            }

            DatabaseHelper.pool = createPool({
                host: MYSQL_HOST,
                port,
                user: MYSQL_USER,
                password: MYSQL_PASSWORD,
                database: MYSQL_DATABASE,
                waitForConnections: true,
                connectionLimit: 5,
                queueLimit: 0,
                namedPlaceholders: true,
            });
        }

        return DatabaseHelper.pool;
    }
}