import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'VGMS NestJS Backend',
      timestamp: new Date().toISOString(),
      port: 4000,
    };
  }
}
