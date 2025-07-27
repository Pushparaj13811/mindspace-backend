import { userSchemas } from './user.js';
import { authSchemas } from './auth.js';
import { moodSchemas } from './mood.js';
import { journalSchemas } from './journal.js';
import { companySchemas } from './company.js';
import { aiSchemas } from './ai.js';
import { commonSchemas } from './common.js';

export const schemas = {
  ...userSchemas,
  ...authSchemas,
  ...moodSchemas,
  ...journalSchemas,
  ...companySchemas,
  ...aiSchemas,
  ...commonSchemas,
};