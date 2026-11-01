import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: {
        sub: string | number;
        username: string;
    }): Promise<{
        id: number;
        name: string;
        username: string;
        email: string | null;
        roleId: number;
        role: {
            id: bigint;
            description: string | null;
            createdAt: Date;
            name: string;
        };
    }>;
}
export {};
