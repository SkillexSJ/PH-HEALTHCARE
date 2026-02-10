import { CookieOptions, Request, Response } from "express";

/**
 * This is a utility module for handling cookies in an Express application. It provides functions to set, get, and clear cookies in the HTTP response and request objects. The functions are designed to work with the Express framework and can be used to manage cookies for user sessions, authentication tokens, and other purposes as needed in the application.
 */
const setCookie = (
  res: Response,
  key: string,
  value: string,
  options: CookieOptions,
) => {
  res.cookie(key, value, options);
};

const getCookie = (req: Request, key: string) => {
  return req.cookies[key];
};

const clearCookie = (res: Response, key: string, options: CookieOptions) => {
  res.clearCookie(key, options);
};

export const CookieUtils = {
  setCookie,
  getCookie,
  clearCookie,
};
