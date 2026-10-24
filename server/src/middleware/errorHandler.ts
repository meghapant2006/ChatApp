import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const rawIssues = (err as any).issues || (err as any).errors || [];
    const formattedErrors = rawIssues.map((issue: any) => ({
      field: Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path ?? ""),
      message: issue.message,
    }));

    res.status(400).json({
      status: "fail",
      message: "Validation failed",
      errors: formattedErrors,
    });
    return;
  }

  // 2. Custom AppErrors (e.g. UnauthorizedError, NotFoundError, ConflictError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode >= 500 ? "error" : "fail",
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // 3. MongoDB Duplicate Key (code 11000)
  if (err.code === 11000) {
    const duplicateKey = Object.keys(err.keyValue || {})[0] || "field";
    res.status(409).json({
      status: "fail",
      message: `A record with this ${duplicateKey} already exists`,
    });
    return;
  }

  // 4. JWT Errors
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      status: "fail",
      message: "Invalid token",
    });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      status: "fail",
      message: "Token expired",
    });
    return;
  }

  // 5. Unhandled Server Errors
  logger.error(err, "Unhandled Server Error");
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
}
