import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, inject, input, model, signal, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSpinner } from '@angular/material/progress-spinner';
import type { BarId } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MediaRepository } from '../../../core/data-access/media-repository';

@Component({
  selector: 'coaster-image-uploader',
  standalone: true,
  imports: [MatIcon, MatSpinner, TranslatePipe],
  template: `
    <div class="flex flex-col gap-2 w-full">
      @if (label()) {
        <span class="text-sm font-medium text-gray-700">{{ label() }}</span>
      }

      <label
        [attr.for]="fileInputId"
        class="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg transition-colors overflow-hidden group cursor-pointer"
        [class.border-primary-500]="isDragging()"
        [class.bg-primary-50]="isDragging()"
        [class.border-gray-300]="!isDragging()"
        [class.hover:bg-gray-50]="!isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <input
          #fileInput
          [id]="fileInputId"
          type="file"
          class="hidden"
          accept="image/*"
          (change)="onFileSelected($event)"
          [disabled]="disabled() || uploading()"
        />

        @if (previewUrl) {
          <img [src]="previewUrl" alt="Preview" class="w-full h-full object-cover" />
          <div
            class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <mat-icon class="text-white">edit</mat-icon>
          </div>
        } @else {
          <div class="flex flex-col items-center justify-center p-4 text-center">
            <mat-icon class="text-gray-400 mb-2">cloud_upload</mat-icon>
            <p class="text-sm text-gray-600">
              <span class="font-semibold">{{ 'UPLOAD_CLICK_TO_UPLOAD' | translate }}</span>
              {{ 'UPLOAD_DRAG_DROP' | translate }}
            </p>
            <p class="text-xs text-gray-500 mt-1">PNG, JPG, WEBP</p>
          </div>
        }

        @if (uploading()) {
          <div class="absolute inset-0 bg-white/70 flex items-center justify-center">
            <mat-spinner diameter="32"></mat-spinner>
          </div>
        }
      </label>

      <!-- Option to paste URL directly -->
      <div class="flex items-center gap-2 mt-2">
        <input
          type="text"
          class="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
          [placeholder]="'UPLOAD_OR_PASTE_URL' | translate"
          [value]="value()"
          (input)="onUrlPaste($event)"
          [disabled]="disabled() || uploading()"
        />
      </div>
    </div>
  `,
})
export class ImageUploader {
  private static nextId = 0;

  private readonly mediaRepo = inject(MediaRepository);
  private readonly http = inject(HttpClient);

  readonly value = model<string>('');
  readonly barId = input.required<BarId>();
  readonly entityType = input<string>('products');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly fileInputId = `image-uploader-file-${ImageUploader.nextId++}`;

  readonly isDragging = signal(false);
  readonly uploading = signal(false);

  // Use a computed-like signal for preview URL (if we have a local preview, use it, else use the value)
  readonly localPreviewUrl = signal<string | null>(null);

  readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  get previewUrl(): string {
    return this.localPreviewUrl() || this.value();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.disabled() && !this.uploading()) {
      this.isDragging.set(true);
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);

    if (this.disabled() || this.uploading()) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
      // Reset input so the same file can be selected again if needed
      input.value = '';
    }
  }

  onUrlPaste(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value.set(input.value);
    this.localPreviewUrl.set(null); // Clear local preview if they manually type a URL
  }

  private async handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file);
    this.localPreviewUrl.set(objectUrl);
    this.uploading.set(true);

    try {
      // 1. Get signed URL
      const response = await this.mediaRepo.generateUploadUrls(this.barId(), {
        entityType: this.entityType(),
        files: [{ filename: file.name, contentType: file.type }],
      });

      if (response && response.length > 0) {
        const { uploadUrl, publicUrl } = response[0];

        // 2. Upload file directly to GCS via PUT
        await this.http
          .put(uploadUrl, file, {
            headers: { 'Content-Type': file.type },
          })
          .toPromise();

        // 3. Update the model with the public URL
        this.value.set(publicUrl);
      }
    } catch (error) {
      console.error('Failed to upload image', error);
      // Revert preview on error
      this.localPreviewUrl.set(null);
    } finally {
      this.uploading.set(false);
    }
  }
}
