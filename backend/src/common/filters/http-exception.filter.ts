import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: any = 'Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.';
    let error = 'Internal Server Error';
    let validationErrors: string[] | undefined = undefined;

    if (exceptionResponse) {
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const respObj = exceptionResponse as any;
        if (Array.isArray(respObj.message)) {
          // Flatten ValidationPipe errors into clean Indonesian readable text
          validationErrors = respObj.message;
          message = respObj.message.join('. ');
        } else {
          message = respObj.message || respObj.error || message;
        }
        error = respObj.error || error;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Catat log server error (500+) untuk penelusuran developer
    if (status >= 500) {
      this.logger.error(
        `[HTTP ${status}] ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      ...(validationErrors ? { errors: validationErrors } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
