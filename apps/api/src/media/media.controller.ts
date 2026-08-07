import { FirebaseAuthGuard } from '@coaster/auth';
import { BarPermission, MediaUploadResponse } from '@coaster/common';
import { BarPermissions, BarPermissionsGuard } from '@coaster/core';
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GenerateUploadUrlsDto } from './dto/generate-upload-urls.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('bars/:barId/media')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-urls')
  @BarPermissions(BarPermission.BAR_UPDATE_PRODUCT)
  @ApiOperation({ summary: 'Generate signed URLs for uploading media directly to cloud storage' })
  @ApiResponse({ status: 201, description: 'Signed URLs generated successfully' })
  async generateUploadUrls(
    @Param('barId') barId: string,
    @Body() dto: GenerateUploadUrlsDto,
  ): Promise<MediaUploadResponse[]> {
    return this.mediaService.generateUploadUrls(barId, dto.entityType, dto.files);
  }
}
