import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { KmsManagerReadGuard } from '../../common/guards/kms-manager-read.guard.js';
import { MealCategoryResponseDto } from './dto/meal-category-response.dto.js';
import { MenuCategoriesService } from './menu-categories.service.js';

@ApiTags('KMS Manager - Meal Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing or invalid Gateway staff session.',
})
@ApiForbiddenResponse({
  description: 'Only KITCHEN_MANAGER can view meal categories.',
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
}
