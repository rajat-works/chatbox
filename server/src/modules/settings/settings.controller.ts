import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  @Get('app')
  @ApiOperation({ summary: 'Get app settings/info' })
  getAppSettings() {
    return {
      appName: 'CoreChat',
      company: 'Corework',
      version: '1.0.0',
      privacyOptions: ['everyone', 'friends', 'nobody'],
      maxFileSize: '25MB',
      maxImageSize: '10MB',
      maxVideoSize: '50MB',
      supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      supportedVideoTypes: ['video/mp4', 'video/webm'],
      supportedFileTypes: ['application/pdf', 'application/doc', 'application/docx', 'text/plain'],
    };
  }
}
