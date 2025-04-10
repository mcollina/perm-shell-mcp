/**
 * Command execution result interface
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Permission request options
 */
export interface PermissionOptions {
  /**
   * The action being requested
   */
  action: string;
  
  /**
   * Optional timeout in seconds for the permission request
   */
  timeout?: number;
  
  /**
   * Whether to wait for a response (default: true)
   */
  wait?: boolean;
}

/**
 * Tool content type as required by MCP
 */
export interface ToolContent {
  type: "text";
  text: string;
}

/**
 * Tool result interface for MCP
 */
export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}
