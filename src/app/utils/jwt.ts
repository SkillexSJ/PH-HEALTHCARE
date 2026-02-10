/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

/**
 * This module provides utility functions for creating, verifying, and decoding JSON Web Tokens (JWTs) used in the authentication process of the application. It includes functions to create access tokens and refresh tokens with specified payloads and expiration times, as well as functions to verify the validity of tokens and decode their contents without verifying the signature.
 */

const createToken = (
  payload: JwtPayload,
  secret: string,
  { expiresIn }: SignOptions,
) => {
  //! Creating the token with JWT
  const token = jwt.sign(payload, secret, { expiresIn });
  return token;
};

const verifyToken = (token: string, secret: string) => {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    //! Manual response structure for token verification result, indicating success and including the decoded token data if verification is successful, or an error message if verification fails.
    return {
      success: true,
      data: decoded,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      error,
    };
  }
};
// Decoding the token without verifying its signature to extract the payload data, which can be useful for certain operations where the token's validity is not a concern, but the contained information is needed.
const decodeToken = (token: string) => {
  const decoded = jwt.decode(token) as JwtPayload;
  return decoded;
};

export const jwtUtils = {
  createToken,
  verifyToken,
  decodeToken,
};
