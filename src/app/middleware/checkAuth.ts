/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import { CookieUtils } from "../utils/cookie";
import { jwtUtils } from "../utils/jwt";

/**
 * Middleware to check user authentication and authorization based on session token and access token.
 *
 * This middleware performs the following checks(shortly):
 * 1. Verifies the presence and validity of the session token in cookies.
 * 2. Checks if the user associated with the session is active and not deleted.
 * 3. Verifies the presence and validity of the access token in cookies.
 * 4. Checks if the user's role matches the required roles for accessing the resource.
 *
 * If any of the checks fail, an appropriate error response is sent back to the client.
 */

export const checkAuth =
  (...authRoles: Role[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      //!Session Token Verification
      const sessionToken = CookieUtils.getCookie(
        req,
        // better auth e eivabe token thake
        "better-auth.session_token",
      );

      if (!sessionToken) {
        throw new Error("Unauthorized access! No session token provided.");
      }

      /**
       * Check if the session token exists in the database and is not expired. If valid, attach the user information to the request object for further processing. Also, check if the session is expiring soon and set appropriate headers for client-side handling.
       */
      if (sessionToken) {
        const sessionExists = await prisma.session.findFirst({
          where: {
            token: sessionToken,
            /// Ensure the session is still valid by checking the expiration time
            expiresAt: {
              gt: new Date(),
            },
          },
          // we will extract user information from the session for further authorization checks and to attach it to the request object
          include: {
            user: true,
          },
        });

        if (sessionExists && sessionExists.user) {
          const user = sessionExists.user;

          const now = new Date();
          const expiresAt = new Date(sessionExists.expiresAt);
          const createdAt = new Date(sessionExists.createdAt);

          // Calculate the percentage of session life remaining and set headers if the session is expiring soon (less than 20% remaining).
          const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
          const timeRemaining = expiresAt.getTime() - now.getTime();
          const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

          //! If the session is expiring soon, set custom headers to inform the client about the session status and remaining time.
          if (percentRemaining < 20) {
            res.setHeader("X-Session-Refresh", "true");
            res.setHeader("X-Session-Expires-At", expiresAt.toISOString());
            res.setHeader("X-Time-Remaining", timeRemaining.toString());

            console.log("Session Expiring Soon!!");
          }

          // block or deleted user checking
          if (
            user.status === UserStatus.BLOCKED ||
            user.status === UserStatus.DELETED
          ) {
            throw new AppError(
              status.UNAUTHORIZED,
              "Unauthorized access! User is not active.",
            );
          }

          // Check if the user is marked as deleted in the database and prevent access if so.
          if (user.isDeleted) {
            throw new AppError(
              status.UNAUTHORIZED,
              "Unauthorized access! User is deleted.",
            );
          }

          // If the user's role does not match any of the required roles for accessing the resource, throw a forbidden access error.
          if (authRoles.length > 0 && !authRoles.includes(user.role)) {
            throw new AppError(
              status.FORBIDDEN,
              "Forbidden access! You do not have permission to access this resource.",
            );
          }

          req.user = {
            userId: user.id,
            role: user.role,
            email: user.email,
          };
        }

        // we will checkt the access toekn for authorization and access control. If the access token is missing or invalid, we will throw an unauthorized access error.
        const accessToken = CookieUtils.getCookie(req, "accessToken");

        if (!accessToken) {
          throw new AppError(
            status.UNAUTHORIZED,
            "Unauthorized access! No access token provided.",
          );
        }
      }

      //Access Token Verification
      const accessToken = CookieUtils.getCookie(req, "accessToken");

      if (!accessToken) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! No access token provided.",
        );
      }

      // verify the access token
      const verifiedToken = jwtUtils.verifyToken(
        accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );

      if (!verifiedToken.success) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! Invalid access token.",
        );
      }

      // If the user's role does not match any of the required roles for accessing the resource, throw a forbidden access error.
      if (
        authRoles.length > 0 &&
        !authRoles.includes(verifiedToken.data!.role as Role)
      ) {
        throw new AppError(
          status.FORBIDDEN,
          "Forbidden access! You do not have permission to access this resource.",
        );
      }

      next();
    } catch (error: any) {
      next(error);
    }
  };
