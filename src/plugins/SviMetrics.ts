import { registerPlugin } from '@capacitor/core';

export interface SviMetricsPlugin {
  /**
   * Checks if the PACKAGE_USAGE_STATS permission has been granted
   */
  checkPermissions(): Promise<{ granted: boolean }>;

  /**
   * Prompts the user to go to Settings -> Usage Access to grant the permission
   */
  requestPermissions(): Promise<void>;

  /**
   * Retrieves the total foreground usage time for all apps over the last month
   * Returns a map of packageName to milliseconds
   */
  getAppUsage(): Promise<Record<string, number>>;
}

const SviMetrics = registerPlugin<SviMetricsPlugin>('SviMetrics');

export default SviMetrics;
