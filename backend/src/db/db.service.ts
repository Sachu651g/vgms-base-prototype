import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../../../db/schema/index';

@Injectable()
export class DbService implements OnModuleInit {
  private readonly logger = new Logger(DbService.name);
  public db: NeonHttpDatabase<typeof schema>;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('DATABASE_URL is not set. Add it to vgms/.env.local');
    }
    const sql = neon(url);
    this.db = drizzle(sql, { schema });
    this.logger.log('✅ Drizzle ORM connected to Neon PostgreSQL');
  }
}
