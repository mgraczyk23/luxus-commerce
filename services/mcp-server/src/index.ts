import express, { Request, Response } from 'express';

const app = express();
const port = process.env.MCP_PORT || 3002;

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'mcp-server' });
});

app.listen(port, () => {
  console.log(`MCP Server running on port ${port}`);
});
