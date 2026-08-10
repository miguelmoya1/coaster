import { FirebaseAuthGuard } from '@coaster/auth';
import { EstablishmentPermission, MediaUploadResponse } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard } from '@coaster/core';
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GenerateUploadUrlsDto } from './dto/generate-upload-urls.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('establishments/:establishmentId/media')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-urls')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_PRODUCT)
  @ApiOperation({ summary: 'Generate signed URLs for uploading media directly to cloud storage' })
  @ApiResponse({ status: 201, description: 'Signed URLs generated successfully' })
  async generateUploadUrls(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: GenerateUploadUrlsDto,
  ): Promise<MediaUploadResponse[]> {
    return this.mediaService.generateUploadUrls(establishmentId, dto.entityType, dto.files);
  }
}
