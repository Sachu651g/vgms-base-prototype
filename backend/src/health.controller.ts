import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns service status and timestamp' })
  @ApiResponse({ status: 200, description: 'Service is healthy', schema: {
    example: { status: 'ok', service: 'VGMS NestJS Backend', timestamp: '2026-05-22T07:00:00.000Z', port: 4000 }
  }})
  check() {
    return {
      status: 'ok',
      service: 'VGMS NestJS Backend',
      timestamp: new Date().toISOString(),
      port: 4000,
    };
  }
}
