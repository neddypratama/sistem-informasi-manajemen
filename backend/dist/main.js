import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';
async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api/v1');
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
        next();
    });
    const envCors = process.env.CORS_ORIGIN;
    const configuredOrigins = envCors
        ? envCors.split(',').map((o) => o.trim())
        : [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:4173',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
        ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            if (configuredOrigins.includes('*')) {
                return callback(null, true);
            }
            if (configuredOrigins.includes(origin)) {
                return callback(null, true);
            }
            if (/^https?:\/\/([a-zA-Z0-9-]+\.)*bimapratama\.com(?::\d+)?$/.test(origin)) {
                return callback(null, true);
            }
            if (process.env.NODE_ENV !== 'production' ||
                origin.includes('localhost') ||
                origin.includes('127.0.0.1')) {
                return callback(null, true);
            }
            logger.warn(`Blocked CORS request from unauthorized origin: ${origin}`);
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    });
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    const port = process.env.PORT || 4000;
    await app.listen(port);
    logger.log(`🚀 Bima Pratama ERP 2.0 API is running on: http://localhost:${port}/api/v1`);
}
bootstrap().catch((err) => {
    new Logger('Bootstrap').error('Failed to start NestJS application', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map