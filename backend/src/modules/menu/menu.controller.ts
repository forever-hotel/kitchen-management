import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { KmsManagerReadGuard } from '../../common/guards/kms-manager-read.guard.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { MenuItemResponseDto } from './dto/menu-item-response.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';
import { MenuService } from './menu.service.js';

@ApiTags('KMS Manager - Menu Items')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Gateway staff session.' })
@ApiForbiddenResponse({ description: 'Only KITCHEN_MANAGER can administer menu items.' })
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
  getItem(
    @Param('menuItemId', new ParseUUIDPipe()) menuItemId: string,
  ): Promise<MenuItemResponseDto> {
    return this.menu.getItem(menuItemId);
  }

  @Post()
  @ApiOperation({ summary: 'Create menu item and tag links transactionally (manager only)' })
  @ApiBody({ type: CreateMenuItemDto })
  @ApiCreatedResponse({ type: MenuItemResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid menu values or tag UUID format.' })
  @ApiNotFoundResponse({ description: 'Category, allergen or dietary label does not exist.' })
  @ApiConflictResponse({ description: 'Menu item name already exists within this category.' })
  createItem(@Body() body: unknown): Promise<MenuItemResponseDto> {
    return this.menu.createItem(body);
  }

  @Patch(':menuItemId')
  @ApiOperation({ summary: 'Update menu item and replace supplied tag links transactionally (manager only)' })
  @ApiBody({ type: UpdateMenuItemDto })
  @ApiOkResponse({ type: MenuItemResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid menu UUID or fields.' })
  @ApiNotFoundResponse({ description: 'Menu item, category or tag not found.' })
  @ApiConflictResponse({ description: 'Menu item name already exists within this category.' })
  updateItem(
    @Param('menuItemId', new ParseUUIDPipe()) menuItemId: string,
    @Body() body: unknown,
  ): Promise<MenuItemResponseDto> {
    return this.menu.updateItem(menuItemId, body);
  }
}
