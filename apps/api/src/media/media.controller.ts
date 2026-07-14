import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { GenerateUploadUrlsDto } from './dto/generate-upload-urls.dto';
import { FirebaseAuthGuard } from '../auth';
import { BarPermissions, BarPermissionsGuard } from '../core';
import { BarPermission, MediaUploadResponse } from '@coaster/common';

@ApiTags('Media')
@Controller('bars/:barId/media')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-urls')
  @BarPermissions(BarPermission.BAR_UPDATE_PRODUCT) // Assuming uploading media needs update permissions
  @ApiOperation({ summary: 'Generate signed URLs for uploading media directly to cloud storage' })
  @ApiResponse({ status: 201, description: 'Signed URLs generated successfully' })
  async generateUploadUrls(
    @Param('barId') barId: string,
    @Body() dto: GenerateUploadUrlsDto,
  ): Promise<MediaUploadResponse[]> {
    return this.mediaService.generateUploadUrls(barId, dto.entityType, dto.files);
  }
}
