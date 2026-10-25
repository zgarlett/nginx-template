import express from "express";
import { type ProductInput, type InventorySummary } from "@inventory/shared";
import loginRoutes from "./routes/LoginRoutes.js";
import statementRoutes from "./routes/StatementRoutes.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.use('/api/login', loginRoutes);
app.use('/api/statements', statementRoutes);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Request failed:", error);
  response.status(500).json({ error: "The request could not be completed." });
});

app.listen(port, () => console.log(`Inventory API listening on port ${port}`));
