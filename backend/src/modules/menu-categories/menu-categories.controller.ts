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
import { CreateMealCategoryDto } from './dto/create-meal-category.dto.js';
import { MealCategoryResponseDto } from './dto/meal-category-response.dto.js';
import { OrderingWindowResponseDto } from './dto/ordering-window-response.dto.js';
import { UpdateOrderingWindowDto } from './dto/update-ordering-window.dto.js';
import { UpdateOrderingEnabledDto } from './dto/update-ordering-enabled.dto.js';
import { UpdateMealCategoryDto } from './dto/update-meal-category.dto.js';
import { MenuCategoriesService } from './menu-categories.service.js';

@ApiTags('KMS Manager - Meal Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing or invalid Gateway staff session.',
})
@ApiForbiddenResponse({
  description: 'Only KITCHEN_MANAGER can manage meal categories.',
})
@UseGuards(KmsManagerReadGuard)
@Controller(['api/v1/menu/categories', 'kms/api/v1/menu/categories'])
export class MenuCategoriesController {
  constructor(private readonly categories: MenuCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List meal categories and their ordering windows' })
  @ApiOkResponse({ type: MealCategoryResponseDto, isArray: true })
  listCategories(): Promise<MealCategoryResponseDto[]> {
    return this.categories.listCategories();
  }

  @Get(':categoryId/window')
  @ApiOperation({
    summary: 'Read saved hotel-local ordering window for a meal category',
  })
  @ApiOkResponse({ type: OrderingWindowResponseDto })
  @ApiBadRequestResponse({ description: 'Malformed category UUID.' })
  @ApiNotFoundResponse({ description: 'Category does not exist.' })
  getOrderingWindow(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
  ): Promise<OrderingWindowResponseDto> {
    return this.categories.getOrderingWindow(categoryId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a meal category (manager only)' })
  @ApiBody({ type: CreateMealCategoryDto })
  @ApiCreatedResponse({ type: MealCategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid name or ordering window.' })
  @ApiConflictResponse({ description: 'Category name already exists.' })
  createCategory(@Body() payload: unknown): Promise<MealCategoryResponseDto> {
    return this.categories.createCategory(payload);
  }

  @Patch(':categoryId/window')
  @ApiOperation({
    summary:
      'Update approved category ordering times (manager only, Asia/Colombo)',
    description:
      'Same-day only; start inclusive and cutoff exclusive. Cross-category overlap policy is pending approval.',
  })
  @ApiBody({ type: UpdateOrderingWindowDto })
  @ApiOkResponse({ type: OrderingWindowResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid time, invalid UUID, or unsupported window field.',
  })
  @ApiNotFoundResponse({ description: 'Category does not exist.' })
  updateOrderingWindow(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() payload: unknown,
  ): Promise<OrderingWindowResponseDto> {
    return this.categories.updateOrderingWindow(categoryId, payload);
  }

  @Patch(':categoryId/window/enabled')
  @ApiOperation({
    summary:
      'Enable or disable a saved category ordering window (manager only)',
  })
  @ApiBody({ type: UpdateOrderingEnabledDto })
  @ApiOkResponse({ type: OrderingWindowResponseDto })
  @ApiBadRequestResponse({
    description: 'Expected exactly one boolean orderingEnabled field.',
  })
  @ApiNotFoundResponse({ description: 'Category does not exist.' })
  updateOrderingEnabled(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() payload: unknown,
  ): Promise<OrderingWindowResponseDto> {
    return this.categories.updateOrderingEnabled(categoryId, payload);
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Update permitted category fields (manager only)' })
  @ApiBody({ type: UpdateMealCategoryDto })
  @ApiOkResponse({ type: MealCategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Malformed UUID or category fields.' })
  @ApiNotFoundResponse({ description: 'Category does not exist.' })
  @ApiConflictResponse({ description: 'Category name already exists.' })
  updateCategory(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() payload: unknown,
  ): Promise<MealCategoryResponseDto> {
    return this.categories.updateCategory(categoryId, payload);
  }
}
