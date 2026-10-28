import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseHealthController } from './database-health.controller';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
  controllers: [DatabaseHealthController],
})
export class PrismaModule {}
