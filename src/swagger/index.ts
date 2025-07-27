import { config } from '../utils/config.js';
import { openAPIInfo } from './info.js';
import { openAPITags } from './tags.js';
import { openAPIServers } from './servers.js';
import { securitySchemes } from './components/security.js';
import { responses } from './components/responses.js';
import { schemas } from './schemas/index.js';
import { paths } from './routes/index.js';

export const swaggerConfig = {
  documentation: {
    openapi: '3.0.0' as const,
    info: openAPIInfo,
    tags: openAPITags,
    servers: openAPIServers(config),
    paths: paths as any,
    components: {
      securitySchemes,
      responses,
      schemas,
    },
  },
  path: '/swagger',
  exclude: ['/swagger', '/swagger.json'],
};