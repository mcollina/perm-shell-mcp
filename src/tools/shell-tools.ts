import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as path from "path";
import * as os from "os";
import { execAsync, askPermission, ExecOptionsWithInput, sanitizeCommand } from "../utils/helpers.js";
import { ToolContent, ToolResult } from "../utils/types.js";

export function registerShellTools(server: McpServer): void {
  // Tool to execute a shell command
  server.tool(
    "execute-command",
    "Execute a shell command",
    {
      command: z.string().describe("The shell command to execute"),
      cwd: z.string().optional().describe("Directory to run the command in (defaults to system temp directory)"),
      timeout: z.number().optional().describe("Timeout in milliseconds after which the process is killed"),
      stdin: z.string().optional().describe("Optional input to provide to the command's standard input")
    },
    async ({ command, cwd, timeout, stdin }) => {
      try {
        // Sanitize command for display
        const sanitizedCommand = sanitizeCommand(command);
        
        // Determine execution directory
        const execDir = cwd ? path.resolve(cwd) : os.tmpdir();
        
        // Request permission with meaningful context
        let permissionMessage = `Execute: ${sanitizedCommand} (in ${execDir})`;
        if (stdin !== undefined) {
          permissionMessage += " with provided standard input";
        }
        
        // Ask for permission - retry up to 5 times
        let permitted = false;
        let tries = 0;
        
        while (!permitted && tries < 5) {
          tries++;
          permitted = await askPermission(permissionMessage);
          
          if (!permitted && tries >= 5) {
            return {
              isError: true,
              content: [{ 
                type: "text" as const, 
                text: "Permission denied by user after multiple attempts" 
              }]
            };
          }
        }
        
        // Set up execution options
        const execOptions: ExecOptionsWithInput = {
          cwd: execDir,
          timeout: timeout || 30000, // Default 30 seconds timeout
        };
        
        // Add stdin if provided
        if (stdin !== undefined) {
          execOptions.input = stdin;
        }
        
        // Execute the command
        const { stdout, stderr } = await execAsync(command, execOptions);
        
        return {
          content: [
            { 
              type: "text" as const, 
              text: stdout || "Command executed successfully with no output" 
            },
            ...(stderr ? [{ 
              type: "text" as const, 
              text: `Standard Error:\n${stderr}` 
            }] : [])
          ]
        };
      } catch (error) {
        // Handle execution errors
        const execError = error as any;
        const stdout = execError.stdout || '';
        const stderr = execError.stderr || '';
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          isError: true,
          content: [
            ...(stdout ? [{ 
              type: "text" as const, 
              text: stdout 
            }] : []),
            { 
              type: "text" as const, 
              text: `Error executing command: ${errorMessage}\n${stderr}` 
            }
          ]
        };
      }
    }
  );

  // Tool to get system information
  server.tool(
    "system-info",
    "Get system information",
    {},
    async () => {
      try {
        // This command doesn't need permissions as it only retrieves read-only system info
        const commands = [
          "uname -a",                  // Operating system info
          "uptime",                    // System uptime
          "free -h || vm_stat",        // Memory usage (Linux || MacOS)
          "df -h | grep -v loop",      // Disk usage
          "cat /proc/cpuinfo | grep 'model name' | head -1 || sysctl -n machdep.cpu.brand_string" // CPU info
        ];
        
        const results = await Promise.all(
          commands.map(async (cmd) => {
            try {
              const { stdout } = await execAsync(cmd);
              return stdout.trim();
            } catch (error) {
              return `Failed to execute: ${cmd}`;
            }
          })
        );
        
        return {
          content: [{ 
            type: "text" as const, 
            text: results.join("\n\n")
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ 
            type: "text" as const, 
            text: `Error retrieving system information: ${errorMessage}` 
          }]
        };
      }
    }
  );

  // Tool to find files
  server.tool(
    "find-files",
    "Find files matching a pattern",
    {
      pattern: z.string().describe("File name pattern to search for"),
      directory: z.string().optional().describe("Directory to search in (defaults to current directory)"),
      maxDepth: z.number().optional().describe("Maximum directory depth to search")
    },
    async ({ pattern, directory = ".", maxDepth }) => {
      try {
        const dir = path.resolve(directory);
        
        // Request permission
        const permissionMessage = `Search for files matching "${pattern}" in ${dir}`;
        const permitted = await askPermission(permissionMessage);
        
        if (!permitted) {
          return {
            isError: true,
            content: [{ 
              type: "text" as const, 
              text: "Permission denied by user" 
            }]
          };
        }
        
        // Build find command based on OS
        let findCommand = '';
        if (os.platform() === 'win32') {
          // Windows - use dir /s /b
          findCommand = `dir /s /b "${pattern}"`;
        } else {
          // Unix-like - use find
          findCommand = `find "${dir}" -type f -name "${pattern}"`;
          if (maxDepth !== undefined) {
            findCommand += ` -maxdepth ${maxDepth}`;
          }
        }
        
        const { stdout, stderr } = await execAsync(findCommand);
        
        if (!stdout.trim()) {
          return {
            content: [{ 
              type: "text" as const, 
              text: `No files matching "${pattern}" found in ${dir}` 
            }]
          };
        }
        
        return {
          content: [{ 
            type: "text" as const, 
            text: stdout 
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ 
            type: "text" as const, 
            text: `Error finding files: ${errorMessage}` 
          }]
        };
      }
    }
  );
}
