var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
import { Catch, HttpException, HttpStatus, Logger, } from '@nestjs/common';
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
        let message = 'Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.';
        let error = 'Internal Server Error';
        let validationErrors = undefined;
        if (exceptionResponse) {
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const respObj = exceptionResponse;
                if (Array.isArray(respObj.message)) {
                    validationErrors = respObj.message;
                    message = respObj.message.join('. ');
                }
                else {
                    message = respObj.message || respObj.error || message;
                }
                error = respObj.error || error;
            }
            else if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        if (status >= 500) {
            this.logger.error(`[HTTP ${status}] ${message}`, exception instanceof Error ? exception.stack : undefined);
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
};
AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    Catch()
], AllExceptionsFilter);
export { AllExceptionsFilter };
//# sourceMappingURL=http-exception.filter.js.map