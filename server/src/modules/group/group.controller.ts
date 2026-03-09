import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get group info' })
  async getGroup(@Param('id') id: string) {
    return this.groupService.getGroupInfo(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update group' })
  async updateGroup(
    @Param('id') id: string,
    @Req() req: any,
    @Body() data: { groupName?: string; groupDescription?: string; tags?: string[] },
  ) {
    const userId = req.user?._id?.toString();
    return this.groupService.updateGroup(id, userId, data);
  }

  @Post(':id/members/:memberId')
  @ApiOperation({ summary: 'Add member to group' })
  async addMember(
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.groupService.addMember(groupId, userId, memberId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from group' })
  async removeMember(
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.groupService.removeMember(groupId, userId, memberId);
  }

  @Post(':id/admins/:memberId')
  @ApiOperation({ summary: 'Make member an admin' })
  async makeAdmin(
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.groupService.makeAdmin(groupId, userId, memberId);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave group' })
  async leaveGroup(
    @Param('id') groupId: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.groupService.leaveGroup(groupId, userId);
  }
}
