import { Module } from '@nestjs/common';
import { TonapiService } from './tonapi.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [TonapiService],
  exports: [TonapiService],
})
export class TonapiModule {}
