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
@Controller('api/v1/menu/categories')
export class MenuCategoriesController {
  constructor(private readonly categories: MenuCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List meal categories and their ordering windows' })
  @ApiOkResponse({ type: MealCategoryResponseDto, isArray: true })
  listCategories(): Promise<MealCategoryResponseDto[]> {
    return this.categories.listCategories();
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
