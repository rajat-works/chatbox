import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(private configService: ConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get WebRTC ICE server configuration' })
  getIceConfig() {
    return {
      iceServers: [
        {
          urls: this.configService.get<string>(
            'STUN_SERVER_URL',
            'stun:stun.l.google.com:19302',
          ),
        },
        ...(this.configService.get('TURN_SERVER_URL')
          ? [
              {
                urls: this.configService.get<string>('TURN_SERVER_URL'),
                username: this.configService.get<string>('TURN_USERNAME'),
                credential: this.configService.get<string>('TURN_CREDENTIAL'),
              },
            ]
          : []),
      ],
    };
  }
}
