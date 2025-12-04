import { PartialType, PickType } from '@nestjs/swagger';
import { Template } from '../entities/template.entity';

export class UpdateTemplateDto extends PartialType(
  PickType(Template, [
    'title',
    'send_email',
    'email_subject',
    'email_body',
    'send_sms',
    'sms_body',
  ] as const),
) {}
