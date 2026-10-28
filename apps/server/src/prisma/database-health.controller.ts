import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class DatabaseHealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'down',
      });
    }
  }
}
