import express, { type Router } from 'express';
import { FinanceMetricsHandler } from '../handlers/FinanceMetricsHandler.js';
import { StatementHandler } from '../handlers/StatementHandler.js';

const statementHandler = new StatementHandler();
const financeMetricsHandler = new FinanceMetricsHandler();
const statementRoutes: Router = express.Router();

statementRoutes.get('/metrics', (req, res) => financeMetricsHandler.getMetrics(req, res));
statementRoutes.post('/import', (req, res) => statementHandler.import(req, res));
statementRoutes.get('/files', (req, res) => statementHandler.getFileNames(req, res));
statementRoutes.delete('/files', (req, res) => statementHandler.deleteFiles(req, res));

export default statementRoutes;