// This file defines the structure of error responses in the healthcare management system.
export interface TErrorSources {
  path: string;
  message: string;
}

export interface TErrorResponse {
  statusCode?: number;
  success: boolean;
  message: string;
  errorSources: TErrorSources[];
  stack?: string;
  error?: unknown;
}
