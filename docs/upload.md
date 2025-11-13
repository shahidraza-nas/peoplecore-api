<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# File Upload Guide

[Back to docs](./index.md)

## Table of Contents

- [Basic File Upload](#basic-file-upload)
- [Advanced Upload Options](#advanced-upload-options)
- [File Validation](#file-validation)
- [CDN Configuration](#cdn-configuration)
- [S3 Integration](#s3-integration)

## Basic File Upload

Step-by-step guide to implement file uploads:

1. **Entity Configuration**
2. **DTO Setup**
3. **Controller Implementation**
4. **Module Configuration**

### Basic file upload

- Add image field in Entity

  ```js
  // src/modules/good/entities/good.entity.ts
  import config from 'src/config';

  @Table
  export class Good extends Entity<Good> {
    ...
    @Column
    @ApiProperty({
      description: 'Image',
      example: 'good/sample.png',
    })
    @IsOptional()
    @IsString()
    get image(): string {
      return this.getDataValue('image')
        ? config().cdnURL + this.getDataValue('image')
        : null;
    }

    set image(v: string) {
      this.setDataValue(
        'image',
        typeof v === 'string' ? v.replace(config().cdnURL, '') : null,
      );
    }
    ...
  }
  ```

- Define DTO for upload API
  ```js
  // src/modules/good/dto/upload-good.dto.ts
  export class UploadGoodDto extends PartialType(Good) {
    @ApiProperty({
      type: 'string',
      format: 'binary',
      description: 'Good image file',
    })
    image_file: any;
  }
  ```
- Add `FileInterceptor` to controller route
  ```js
  // src/modules/good/good.controller.ts
  /**
   * Upload
   */
  @Post('upload')
  ...
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image_file'))
  async upload(
    ...
    @Body() uploadGoodDto: UploadGoodDto, // Other body parameters
    @UploadedFile() imageFile: Express.Multer.File, // Uploaded file
  ) {
    ...
  }
  ```
- Import and configure `MulterModule` in Module

  ```js
  // src/modules/good/good.module.ts
  import { Module } from '@nestjs/common';
  import { ConfigModule, ConfigService } from '@nestjs/config';
  import { MulterModule } from '@nestjs/platform-express';
  import { extname } from 'path';
  import { existsSync, mkdirSync } from 'fs';
  import { diskStorage } from 'multer';
  import { Good } from './entities/good.entity';
  import { uuid } from 'src/core/core.utils';

  @Module({
    imports: [
      ...
      MulterModule.registerAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          // use diskStorage to store files locally
          // files will be uploaded to path specified as cdnPath in config
          storage: diskStorage({
            destination: function (req, file, cb) {
              const uploadPath = configService.get('cdnPath');
              existsSync(uploadPath) || mkdirSync(uploadPath);
              cb(null, uploadPath);
            },
            filename: function (req, file, cb) {
              const ext = extname(file.originalname);
              cb(null, `good/${Date.now()}-${uuid()}${ext}`); // file name with path to save
            },
          }),
        }),
        inject: [ConfigService],
      }),
    ],
    ...
  })
  export class GoodModule {}
  ```

- Save filename to body
  ```js
  job.body.image = imageFile.filename;
  ```

## Advanced Upload Options

Explore advanced options for file uploads, including decorators and multiple file handling.

### Upload using `FileUploads` decorator

- `FileUploads` decorator will set `FileFieldsInterceptor` and provide additional options to map file properties with body

  ```js
  import { FileUploads } from 'src/core/core.decorators';

  ...
  @FileUploads([
    { name: 'image_file', required: true, bodyField: 'image' },
    { name: 'license_file', required: true, bodyField: 'license' },
  ])
  // By setting required option to TRUE, request will throw BadRequestException if no file is uploaded
  // use bodyField option to set the filename to body[bodyField]
  ...
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() createTicketChatDto: CreateTicketChatDto,
  ) {
    console.log(createTicketChatDto);
    // { ..., image: 'images/avatar.png', license: 'licenses/sample.pdf' }
  }

  ```

- Bind multiple properties
  ```js
  @FileUploads([
    {
      name: 'file',
      bodyField: { file: 'filename', file_type: 'mimetype' },
    },
  ])
  // { ..., file: 'images/avatar.png', file_type: 'image/png' }
  ```

## File Validation

Ensure uploaded files meet your application's requirements.

- Accept image files only
  ```js
  @Module({
    imports: [
      ...
      MulterModule.registerAsync({
        imports: [ConfigModule],
        useFactory: () => ({
          storage: /* Storage */,
          fileFilter: function (req, file, cb) {
            const ext = extname(file.originalname);
            const validExtensions = ['.png', '.jpeg', '.jpg'];
            const validMimetypes = ['image/png', 'image/jpeg', 'image/jpg'];
            if (
              validMimetypes.includes(file.mimetype) &&
              validExtensions.includes(ext)
            )
              return cb(null, true);
            return cb(
              new UploadException({
                file,
                field: file.fieldname,
                message: 'File should be a valid image file',
              }),
              false,
            );
            // UploadException only works with FileUploads decorator
          },
        }),
        inject: [ConfigService],
      }),
    ],
    ...
  })
  export class GoodModule {}
  ```

## CDN Configuration

Configure Content Delivery Network (CDN) settings for your file uploads.

- Change CDN globally by changing `cdnStorage` in config
  ```js
  // src/config/index.ts
  export default () => ({
    ...
    /**
     * @property {CDNStorage} cdnStorage
     * Default CDN storage, eg: Local Drive, Aws S3, Azure Storage, etc
     * @default 0 (Local Storage)
     */
    cdnStorage: CDNStorage.Local, //
    ...
  })
  ```
- Change CDN for specific router using `FileUploads` option
  ```js
  @FileUploads([
    { name: 'image_file', required: true, bodyField: 'image' },
    { name: 'license_file', required: true, bodyField: 'license' },
  ], { cdn: CDNStorage.Local })
  ```
- Change CDN for specific file using `FileUploads` option
  ```js
  @FileUploads([
    { name: 'image_file', required: true, bodyField: 'image', cdn: CDNStorage.Local, storage: { /* multer local storage config */ } },
    { name: 'license_file', required: true, bodyField: 'license', cdn: CDNStorage.Aws, storage: { /* multer s3 storage config */ }  },
  ])
  ```

## S3 Integration

Integrate Amazon S3 for scalable file storage.

- Configure AWS and S3 in .env
  ```bash
  ## APP
  ...
  CDN_URL=https://<BUCKET_NAME>.s3.amazonaws.com/
  ```
- Set `cdnStorage` to aws in config
  ```js
  // src/config/index.ts
  export default () => ({
    ...
    /**
     * @property {CDNStorage} cdnStorage
     * Default CDN storage, eg: Local Drive, Aws S3, Azure Storage, etc
     * @default 0 (Local Storage)
     */
    cdnStorage: CDNStorage.Aws,
    ...
  })
  ```
- Configure `MulterModule` for S3 upload

  ```bash
  # install multer for s3
  $ npm i @aws-sdk/client-s3 multer-s3
  $ npm i -D @types/multer-s3
  # OR
  $ yarn add @aws-sdk/client-s3 multer-s3
  $ yarn add -D @types/multer-s3
  ```

  ```js
  // src/modules/good/good.module.ts
  import { S3Client } from '@aws-sdk/client-s3';
  import * as multerS3 from 'multer-s3';

  const s3 = new S3Client({});

  @Module({
    imports: [
      ...
      MulterModule.registerAsync({
        imports: [ConfigModule],
        useFactory: async (
          configService: ConfigService,
        ) => {
          return {
            storage: multerS3({
              s3: s3,
              bucket: '<BUCKET_NAME>',
              acl: 'public-read', // optional
              key: function (req, file, cb) {
                const ext = extname(file.originalname);
                cb(null, `good/${Date.now()}-${uuid()}${ext}`); // key name to save
              },
              contentType: function (req, file, cb) {
                cb(null, file.mimetype);
              },
            }),
          };
        },
        inject: [ConfigService],
      }),
    ],
    ...
  })
  export class GoodModule {}
  ```

### References

- <a target="_blank" href="https://github.com/expressjs/multer">Multer</a>
- <a target="_blank" href="https://github.com/badunk/multer-s3">Multer S3</a>
- <a target="_blank" href="https://docs.nestjs.com/techniques/file-upload">Nest JS file upload</a>
