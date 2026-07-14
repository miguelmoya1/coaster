export interface MediaFileRequest {
  filename: string;
  contentType: string;
}

export interface GenerateUploadUrlsDto {
  entityType: 'products' | 'templates' | 'users' | 'bars' | string;
  files: MediaFileRequest[];
}

export interface MediaUploadResponse {
  uploadUrl: string;
  publicUrl: string;
}
