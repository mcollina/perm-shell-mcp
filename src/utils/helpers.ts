import { exec } from "child_process";
import { promisify } from "util";
import notifier from "node-notifier";
import { PermissionOptions } from "./types.js";

// Promisify exec for async/await usage
export const execAsync = promisify(exec);

// Type for execAsync options with stdin support
export interface ExecOptionsWithInput extends Record<string, any> {
  input?: string;
  timeout?: number;
  cwd?: string;
}

/**
 * Helper function to ask for permission using node-notifier
 * Returns a promise that resolves to true if permission is granted, false otherwise
 */
export async function askPermission(action: string, options?: Partial<PermissionOptions>): Promise<boolean> {
  // Skip notification if DISABLE_NOTIFICATIONS is set
  if (process.env.DISABLE_NOTIFICATIONS === 'true') {
    console.log(`Auto-allowing action (notifications disabled): ${action}`);
    return true;
  }
  
  return new Promise((resolve) => {
    notifier.notify({
      title: 'Shell Command Permission Request',
      message: `${action}`,
      wait: options?.wait ?? true,
      timeout: options?.timeout ?? 60,
      actions: 'Allow',
      closeLabel: 'Deny'
    }, (err, response, metadata) => {
      if (err) {
        console.error('Error showing notification:', err);
        resolve(false);
        return;
      }
      
      const buttonPressed = metadata?.activationValue || response;
      resolve(buttonPressed !== 'Deny');
    });
  });
}

/**
 * Sanitize a command for display in logs and notifications
 * Helps prevent accidentally leaking sensitive information
 */
export function sanitizeCommand(command: string): string {
  // Truncate very long commands for display
  if (command.length > 100) {
    return command.substring(0, 97) + "...";
  }
  return command;
}
