import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { ReportClientErrorDto } from "./dto/report-client-error.dto";

interface ReportingUser {
  userId?: string;
  username?: string;
  role?: string;
}

const REDACTED_VALUE = "[Redacted]";
const SENSITIVE_KEY_PATTERN = /token|password|authorization|cookie|wallet|payment/i;

@Injectable()
export class ClientErrorsService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ClientErrorsService.name);
  }

  report(reportClientErrorDto: ReportClientErrorDto, user?: ReportingUser) {
    const payload = {
      source: reportClientErrorDto.source ?? "browser",
      route: reportClientErrorDto.route,
      requestId: reportClientErrorDto.requestId,
      userAgent: reportClientErrorDto.userAgent,
      reportedBy: user?.userId
        ? {
            userId: user.userId,
            username: user.username,
            role: user.role,
          }
        : undefined,
      metadata: this.sanitizeValue(reportClientErrorDto.metadata),
      stack: this.sanitizeString(reportClientErrorDto.stack),
      componentStack: this.sanitizeString(reportClientErrorDto.componentStack),
    };

    if (reportClientErrorDto.level === "warn") {
      this.logger.warn(payload, reportClientErrorDto.message);
    } else {
      this.logger.error(payload, reportClientErrorDto.message);
    }

    return { logged: true };
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.sanitizeValue(entry));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [
          key,
          SENSITIVE_KEY_PATTERN.test(key)
            ? REDACTED_VALUE
            : this.sanitizeValue(nestedValue),
        ]),
      );
    }

    if (typeof value === "string") {
      return this.sanitizeString(value);
    }

    return value;
  }

  private sanitizeString(value?: string) {
    if (!value) {
      return value;
    }

    return value.length > 4000 ? `${value.slice(0, 4000)}…` : value;
  }
}