import { authPaths } from './auth.js';
import { moodPaths } from './mood.js';
import { journalPaths } from './journal.js';
import { aiPaths } from './ai.js';
import { companyPaths } from './company.js';
import { healthPaths } from './health.js';

export const paths = {
  ...healthPaths,
  ...authPaths,
  ...moodPaths,
  ...journalPaths,
  ...aiPaths,
  ...companyPaths,
};