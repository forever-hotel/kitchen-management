import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { KmsManagerReadGuard } from '../../common/guards/kms-manager-read.guard.js';
import { MenuItemResponseDto } from './dto/menu-item-response.dto.js';
import { MenuService } from './menu.service.js';

@ApiTags('KMS Manager - Menu Reads')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Gateway staff session.' })
@ApiForbiddenResponse({ description: 'Only KITCHEN_MANAGER can view the administration menu.' })
@UseGuards(KmsManagerReadGuard)
@Controller('api/v1/menu/items')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'List all menu items with category, allergens and dietary labels' })
  @ApiOkResponse({ type: MenuItemResponseDto, isArray: true })
  listItems(): Promise<MenuItemResponseDto[]> {
    return this.menu.listItems();
  }

  @Get(':menuItemId')
  @ApiOperation({ summary: 'Read menu item details by UUID' })
  @ApiOkResponse({ type: MenuItemResponseDto })
  @ApiBadRequestResponse({ description: 'Malformed menu item UUID.' })
  @ApiNotFoundResponse({ description: 'Menu item does not exist.' })
  getItem(@Param('menuItemId', new ParseUUIDPipe()) menuItemId: string): Promise<MenuItemResponseDto> {
    return this.menu.getItem(menuItemId);
  }
}
