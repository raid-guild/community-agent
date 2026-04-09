export interface HomeModuleRecord {
  id: string;
  type: string;
  label: string;
  description: string;
  config: Record<string, unknown>;
  enabled: boolean;
  displayOrder: number;
  visibilityRole: string | null;
  createdAt: string;
  updatedAt: string;
}

export function stringifyHomeModuleConfig(config: Record<string, unknown>) {
  return JSON.stringify(config, null, 2);
}