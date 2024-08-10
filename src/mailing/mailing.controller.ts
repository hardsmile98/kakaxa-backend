import { Body, Controller, Post } from '@nestjs/common';
import { MailingService } from './mailing.service';
import { SendToBotDto } from './dto';

@Controller('mailing')
export class MailingController {
  constructor(private mailingService: MailingService) {}

  @Post('/send')
  sentToBot(@Body() dto: SendToBotDto) {
    return this.mailingService.sendToBot(dto);
  }
}
