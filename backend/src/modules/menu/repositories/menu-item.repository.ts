import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type EntityManager } from 'typeorm';

import { MealCategory } from '../../menu-categories/entities/meal-category.entity.js';
import { Allergen } from '../entities/allergen.entity.js';
import { DietaryLabel } from '../entities/dietary-label.entity.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import type {
  MenuItemPatchFields,
  MenuItemWriteFields,
} from '../menu-item-write.validation.js';

const requiredReadRelations = {
  category: true,
  allergens: true,
  dietaryLabels: true,
} as const;

@Injectable()
export class MenuItemRepository {
  constructor(
    @InjectRepository(MenuItem)
    private readonly repository: Repository<MenuItem>,
  ) {}

  findAll(): Promise<MenuItem[]> {
    return this.repository.find({
      relations: requiredReadRelations,
      order: { name: 'ASC' },
    });
  }

  findById(menuItemId: string): Promise<MenuItem | null> {
    return this.repository.findOne({
      where: { menuItemId },
      relations: requiredReadRelations,
    });
  }

  /**
   * One transaction saves item scalars and both many-to-many join tables.
   * The DB's UNIQUE(category_id, name) constraint remains authoritative on races.
   */
  createItem(fields: MenuItemWriteFields): Promise<MenuItem> {
    return this.repository.manager.transaction(async (manager) => {
      const items = manager.getRepository(MenuItem);
      const category = await this.requireCategory(manager, fields.categoryId);
      await this.rejectDuplicate(items, fields.categoryId, fields.name);
      const allergens = await this.requireAllergens(
        manager,
        fields.allergenIds,
      );
      const dietaryLabels = await this.requireDietaryLabels(
        manager,
        fields.dietaryLabelIds,
      );

      const created = items.create({
        categoryId: fields.categoryId,
        category,
        name: fields.name,
        description: fields.description,
        price: fields.price,
        preparationTime: fields.preparationTime,
        portionLimit: fields.portionLimit,
        stockStatus: fields.stockStatus,
        imageUrl: fields.imageUrl,
        allergens,
        dietaryLabels,
      });
      await items.save(created);
      return this.requireSavedItem(items, created.menuItemId);
    });
  }

  /**
   * A write lock serializes competing updates to the same menu item.
   * Absent PATCH tag arrays preserve links; [] removes them. No tag creation.
   */
  updateItem(
    menuItemId: string,
    patch: MenuItemPatchFields,
  ): Promise<MenuItem | null> {
    return this.repository.manager.transaction(async (manager) => {
      const items = manager.getRepository(MenuItem);
      // Lock the base row without LEFT JOINs (PostgreSQL forbids FOR UPDATE on
      // nullable outer-join sides); then load its relations in the same tx.
      const locked = await items.findOne({
        where: { menuItemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) return null;

      const existing = await items.findOne({
        where: { menuItemId },
        relations: requiredReadRelations,
      });
      if (!existing) return null;

      const categoryId = patch.categoryId ?? existing.categoryId;
      const itemName = patch.name ?? existing.name;
      const category =
        patch.categoryId === undefined
          ? existing.category
          : await this.requireCategory(manager, categoryId);
      if (!category) throw new NotFoundException('Meal category not found');

      await this.rejectDuplicate(items, categoryId, itemName, menuItemId);

      const allergens =
        patch.allergenIds === undefined
          ? existing.allergens
          : await this.requireAllergens(manager, patch.allergenIds);
      const dietaryLabels =
        patch.dietaryLabelIds === undefined
          ? existing.dietaryLabels
          : await this.requireDietaryLabels(manager, patch.dietaryLabelIds);

      const changed = items.merge(existing, {
        categoryId,
        category,
        name: itemName,
        description:
          patch.description ??
          (patch.description === null ? null : existing.description),
        price: patch.price ?? existing.price,
        preparationTime: patch.preparationTime ?? existing.preparationTime,
        portionLimit: patch.portionLimit ?? existing.portionLimit,
        stockStatus: patch.stockStatus ?? existing.stockStatus,
        imageUrl:
          patch.imageUrl ??
          (patch.imageUrl === null ? null : existing.imageUrl),
        allergens,
        dietaryLabels,
      });
      await items.save(changed);
      return this.requireSavedItem(items, menuItemId);
    });
  }

  private async requireCategory(
    manager: EntityManager,
    categoryId: string,
  ): Promise<MealCategory> {
    const category = await manager
      .getRepository(MealCategory)
      .findOne({ where: { categoryId } });
    if (!category) throw new NotFoundException('Meal category not found');
    return category;
  }

  private async requireAllergens(
    manager: EntityManager,
    ids: string[],
  ): Promise<Allergen[]> {
    if (!ids.length) return [];
    const values = await manager
      .getRepository(Allergen)
      .find({ where: { allergenId: In(ids) } });
    if (values.length !== ids.length)
      throw new NotFoundException('One or more allergens do not exist');
    return values;
  }

  private async requireDietaryLabels(
    manager: EntityManager,
    ids: string[],
  ): Promise<DietaryLabel[]> {
    if (!ids.length) return [];
    const values = await manager
      .getRepository(DietaryLabel)
      .find({ where: { dietaryLabelId: In(ids) } });
    if (values.length !== ids.length)
      throw new NotFoundException('One or more dietary labels do not exist');
    return values;
  }

  private async rejectDuplicate(
    items: Repository<MenuItem>,
    categoryId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const same = await items.findOne({ where: { categoryId, name } });
    if (same && same.menuItemId !== exceptId) {
      throw new ConflictException(
        'A menu item with this name already exists in the category',
      );
    }
  }

  private async requireSavedItem(
    items: Repository<MenuItem>,
    menuItemId: string,
  ): Promise<MenuItem> {
    const item = await items.findOne({
      where: { menuItemId },
      relations: requiredReadRelations,
    });
    if (!item) throw new Error('Saved menu item could not be reloaded');
    return item;
  }
}
