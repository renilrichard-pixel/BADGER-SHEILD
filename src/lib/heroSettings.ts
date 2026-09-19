import fs from 'fs';
import path from 'path';
import { HeroSettings, DEFAULT_HERO_SETTINGS } from './heroTypes';
import { readCloudJson, writeCloudJson } from './cloudStore';

export type { HeroSettings };
export { DEFAULT_HERO_SETTINGS };

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const FILE_PATH = path.join(DATA_DIR, 'hero-settings.json');

export async function getHeroSettings(): Promise<HeroSettings> {
  try {
    const cloud = await readCloudJson<HeroSettings>('hero-settings.json', DEFAULT_HERO_SETTINGS);
    if (cloud && cloud.headline) {
      return { ...DEFAULT_HERO_SETTINGS, ...cloud };
    }
  } catch {}

  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_HERO_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Error reading hero settings file:', error);
  }
  return DEFAULT_HERO_SETTINGS;
}

export async function saveHeroSettings(settings: Partial<HeroSettings>): Promise<HeroSettings> {
  const current = await getHeroSettings();
  const updated: HeroSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  await writeCloudJson('hero-settings.json', updated);

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (error) {
    // Non-blocking on serverless (read-only filesystem)
  }

  return updated;
}
