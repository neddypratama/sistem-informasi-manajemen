export declare class AppService {
    getHealth(): {
        status: string;
        service: string;
        version: string;
        timestamp: string;
        uptimeSeconds: number;
    };
}
