import { initialMigration } from './001_initial.js';
import { badgeImageUrlMigration } from './002_badge_image_url.js';

export interface Migration {
  name: string;
  sql: string;
}

export const migrations: Migration[] = [initialMigration, badgeImageUrlMigration];