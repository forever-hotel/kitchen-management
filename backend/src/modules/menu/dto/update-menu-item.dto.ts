import { PartialType } from '@nestjs/swagger';

import { CreateMenuItemDto } from './create-menu-item.dto.js';

/** All permitted fields optional for PATCH; at least one is required at runtime. */
export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
