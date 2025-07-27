import type { Config } from '../types/index.js';

export const openAPIServers = (config: Config) => [
  {
    url: `http://localhost:${config.port}`,
    description: 'Development server',
  },
  {
    url: 'https://api.mindspace.com',
    description: 'Production server',
  },
  {
    url: 'https://staging-api.mindspace.com',
    description: 'Staging server',
  }
];