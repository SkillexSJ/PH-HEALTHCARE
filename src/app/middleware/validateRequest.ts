import { NextFunction, Request, Response } from "express";
import z from "zod";

/**
 * THIS is a middleware function that validates incoming HTTP requests against a specified Zod schema. It ensures that the request body adheres to the defined structure and types before allowing the request to proceed to the next middleware or route handler.
 *
 * it sanitizes the faulty data by replacing the original request body with the parsed and validated data from Zod, ensuring that only valid and properly structured data is processed in the application.
 */

export const validateRequest = (zodSchema: z.ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    //! Doing safe parse so it doesnt throw an error immediately and we can handle it in the global error handler
    const parsedResult = zodSchema.safeParse(req.body);

    if (!parsedResult.success) {
      next(parsedResult.error);
    }

    //!sanitizing the data
    req.body = parsedResult.data;

    next();
  };
};
