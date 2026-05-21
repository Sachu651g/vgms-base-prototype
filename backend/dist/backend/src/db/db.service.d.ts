import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../../../db/schema/index';
export declare class DbService implements OnModuleInit {
    private config;
    private readonly logger;
    db: NeonHttpDatabase<typeof schema>;
    constructor(config: ConfigService);
    onModuleInit(): void;
}
