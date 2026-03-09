import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePrivacyDto, DeleteAccountDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMyProfile(@Req() req: any) {
    const userId = req.user?._id?.toString();
    return this.usersService.getProfile(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/avatar')
  @ApiOperation({ summary: 'Update avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req: any, file: any, cb: any) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    }),
  )
  async updateAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const avatarUrl = `/uploads/${file.filename}`;
    const userId = req.user?._id?.toString();
    return this.usersService.updateAvatar(userId, avatarUrl);
  }

  @Patch('me/privacy')
  @ApiOperation({ summary: 'Update privacy settings' })
  async updatePrivacy(
    @Req() req: any,
    @Body() dto: UpdatePrivacyDto,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.updatePrivacy(userId, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete account permanently' })
  async deleteAccount(
    @Req() req: any,
    @Body() dto: DeleteAccountDto,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.deleteAccount(userId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  async searchUsers(
    @Query('q') query: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.searchUsers(query.trim(), userId);
  }

  @Get('friends')
  @ApiOperation({ summary: 'Get friends list' })
  async getFriends(@Req() req: any) {
    const userId = req.user?._id?.toString();
    return this.usersService.getFriends(userId);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get contacts' })
  async getContacts(@Req() req: any) {
    const userId = req.user?._id?.toString();
    return this.usersService.getContacts(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user public profile' })
  async getUserProfile(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.getUserPublicProfile(id, userId);
  }

  @Patch(':id/friend')
  @ApiOperation({ summary: 'Add friend' })
  async addFriend(
    @Req() req: any,
    @Param('id') friendId: string,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.addFriend(userId, friendId);
  }

  @Delete(':id/friend')
  @ApiOperation({ summary: 'Remove friend' })
  async removeFriend(
    @Req() req: any,
    @Param('id') friendId: string,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.removeFriend(userId, friendId);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Block user' })
  async blockUser(
    @Req() req: any,
    @Param('id') blockId: string,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.blockUser(userId, blockId);
  }

  @Delete(':id/block')
  @ApiOperation({ summary: 'Unblock user' })
  async unblockUser(
    @Req() req: any,
    @Param('id') blockId: string,
  ) {
    const userId = req.user?._id?.toString();
    return this.usersService.unblockUser(userId, blockId);
  }
}
