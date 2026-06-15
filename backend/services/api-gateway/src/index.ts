import express, { RequestHandler } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { PORT, CORS_ORIGIN, SERVICE_TARGETS } from './config/env';
import { authenticate, requireAuth } from './middlewares/authenticate';
import { requireRole, requireSelfOrRole } from './middlewares/authorize';
import { createServiceProxy } from './routes/proxy';
import { routeTable } from './routes/routeTable';

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(morgan('dev'));

for (const rule of routeTable) {
  const middlewares: RequestHandler[] = [authenticate];

  if (rule.auth === 'required') {
    middlewares.push(requireAuth);
  }

  if (rule.roles) {
    middlewares.push(requireRole(...rule.roles));
  }

  if (rule.selfParam) {
    middlewares.push(requireSelfOrRole(rule.selfParam, ...(rule.bypassRoles ?? [])));
  }

  middlewares.push(createServiceProxy(SERVICE_TARGETS[rule.target]) as unknown as RequestHandler);

  const register = app[rule.method].bind(app) as (path: string, ...handlers: RequestHandler[]) => void;
  register(rule.path, ...middlewares);
}

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
