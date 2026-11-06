'use client';

import { Alert, Button, Empty, Input, Spin, Tag, Typography } from 'antd';
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  EditOutlined,
  FireOutlined,
  PictureOutlined,
  PlusOutlined,
  SearchOutlined,
  SunOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useMemo, useRef, useState } from 'react';

import type { KmsMealCategoryData } from '@/types/kms-menu';

import type {
  MenuManagementItem,
  MenuManagementScreenProps,
  MenuStockFilter,
} from '../types/menu-management.type';
import {
  filterMenuItems,
  formatCategoryTime,
  getStockCounts,
  getStockFilter,
} from '../utils/menu-management.util';

import { AddCategoryModal } from './add-category-modal';
import { AddMenuItemModal } from './add-menu-item-modal';
import { MenuStockActions } from './menu-stock-actions';
import styles from './menu-management-screen.module.css';

const stockTabs: readonly { value: MenuStockFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
];

const stockLabels = {
  AVAILABLE: 'Available',
  LOW_STOCK: 'Low Stock',
  UNAVAILABLE: 'Unavailable',
  TEMPORARILY_DISABLED: 'Temporarily Disabled',
} as const;

/** Decorative category icons follow the reference screens; no Figma SVGs are embedded. */
function MealCategoryIcon({ name }: { name: string }) {
  switch (name.trim().toLowerCase().replace(/\s+/g, '-')) {
    case 'breakfast':
      return <SunOutlined />;
    case 'lunch':
      return <SunOutlined />;
    case 'tea-time':
      return <CoffeeOutlined />;
    case 'dinner':
      return <FireOutlined />;
    case 'special-meals':
      return <StarOutlined />;
    default:
      return <AppstoreOutlined />;
  }
}

/** Manager menu listing only; editing, persistence and session wiring are separate issues. */
export function MenuManagementScreen({
  categories,
  items,
  loadState = 'ready',
  errorMessage = 'Unable to load menu data. Please try again.',
  dataMode = 'fixtures',
  onRetry,
  onAddCategory,
  onCreateCategory,
  onRefreshCategories,
  onAddMenuItem,
  onEditItem,
  onEditWindow,
  onCreateMenuItem,
  onUpdateMenuItem,
  onReloadMenuItems,
  onChangeStockStatus,
  allergenOptions = [],
  dietaryLabelOptions = [],
  enableMenuModalPreview = false,
}: MenuManagementScreenProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<MenuStockFilter>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [menuModal, setMenuModal] = useState<
    { mode: 'create'; categoryId: string } | { mode: 'edit'; item: MenuManagementItem } | null
  >(null);
  const [reloadedItems, setReloadedItems] = useState<{
    source: readonly MenuManagementItem[];
    values: readonly MenuManagementItem[];
  } | null>(null);
  const [menuReloadError, setMenuReloadError] = useState<string | null>(null);
  const [menuSavedNotice, setMenuSavedNotice] = useState(false);
  const [reloadingMenu, setReloadingMenu] = useState(false);
  const [refreshedCategories, setRefreshedCategories] = useState<{
    source: readonly KmsMealCategoryData[];
    values: readonly KmsMealCategoryData[];
  } | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [creationNotice, setCreationNotice] = useState(false);
  const createdCategoryId = useRef<string | null>(null);
  // Prefer fresh parent data when its categories prop changes, without an effect.
  const currentCategories =
    refreshedCategories?.source === categories ? refreshedCategories.values : categories;

  const refreshCategories = async () => {
    if (!onRefreshCategories || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const updated = await onRefreshCategories();
      setRefreshedCategories({ source: categories, values: updated });
      if (
        createdCategoryId.current &&
        updated.some((category) => category.categoryId === createdCategoryId.current)
      ) {
        setSelectedCategoryId(createdCategoryId.current);
      }
      setCreationNotice(true);
    } catch {
      setRefreshError('Category created, but the category list could not be refreshed.');
    } finally {
      setRefreshing(false);
    }
  };

  const displayItems = reloadedItems?.source === items ? reloadedItems.values : items;
  const previewMode =
    enableMenuModalPreview && dataMode === 'fixtures' && process.env.NODE_ENV !== 'production';
  const canCreateMenu = Boolean(onCreateMenuItem && onReloadMenuItems);
  const canUpdateMenu = Boolean(onUpdateMenuItem && onReloadMenuItems);

  const reloadMenuItems = async () => {
    if (!onReloadMenuItems || reloadingMenu) return;
    setReloadingMenu(true);
    setMenuReloadError(null);
    try {
      const fresh = await onReloadMenuItems();
      setReloadedItems({ source: items, values: fresh });
      setMenuSavedNotice(true);
    } catch {
      setMenuReloadError('Menu item saved, but the menu list could not be reloaded.');
    } finally {
      setReloadingMenu(false);
    }
  };

  // Match the supplied Figma's Lunch-first preview when Lunch exists.
  const fallbackCategory =
    currentCategories.find((category) => category.name.trim().toLowerCase() === 'lunch') ??
    currentCategories[0];
  const selectedCategory =
    currentCategories.find((category) => category.categoryId === selectedCategoryId) ??
    fallbackCategory;

  const categoryItems = useMemo(
    () => displayItems.filter((item) => item.categoryId === selectedCategory?.categoryId),
    [displayItems, selectedCategory?.categoryId],
  );
  const categoryCounts = useMemo(() => getStockCounts(categoryItems), [categoryItems]);
  const visibleItems = useMemo(
    () =>
      selectedCategory
        ? filterMenuItems(displayItems, selectedCategory.categoryId, searchQuery, stockFilter)
        : [],
    [displayItems, selectedCategory, searchQuery, stockFilter],
  );

  const selectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSearchQuery('');
    setStockFilter('ALL');
  };

  return (
    <section aria-labelledby="menu-management-heading" className={styles.workspace}>
      <aside className={styles.sidebar} aria-label="Meal category sidebar">
        <div className={styles.sidebarHeader}>
          <span className={styles.eyebrow}>Meal Categories</span>
          <Button
            block
            ghost
            icon={<PlusOutlined aria-hidden="true" />}
            disabled={!onAddCategory && (!onCreateCategory || !onRefreshCategories)}
            onClick={() => {
              if (onCreateCategory && onRefreshCategories) setModalOpen(true);
              else onAddCategory?.();
            }}
            title={
              !onAddCategory && (!onCreateCategory || !onRefreshCategories)
                ? 'Category creation requires a connected manager API'
                : undefined
            }
          >
            Add Category
          </Button>
        </div>
        <div role="group" aria-label="Select meal category" className={styles.categoryList}>
          {currentCategories.map((category) => {
            const count = displayItems.filter(
              (item) => item.categoryId === category.categoryId,
            ).length;
            const isSelected = selectedCategory?.categoryId === category.categoryId;

            return (
              <button
                key={category.categoryId}
                type="button"
                className={`${styles.categoryButton} ${isSelected ? styles.selectedCategory : ''}`}
                aria-pressed={isSelected}
                onClick={() => selectCategory(category.categoryId)}
              >
                <span className={styles.categoryIcon} aria-hidden="true">
                  <MealCategoryIcon name={category.name} />
                </span>
                <span className={styles.categoryDetails}>
                  <strong>{category.name}</strong>
                  <small>
                    {formatCategoryTime(category.orderStartTime)} –{' '}
                    {formatCategoryTime(category.orderCutoffTime)}
                  </small>
                </span>
                <span className={styles.categoryCount} aria-label={`${count} menu items`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className={styles.main}>
        {menuSavedNotice && !menuReloadError && (
          <Alert
            type="success"
            showIcon
            title="Menu item saved and list reloaded."
            closable
            onClose={() => setMenuSavedNotice(false)}
          />
        )}
        {menuReloadError && (
          <Alert
            type="warning"
            showIcon
            title={menuReloadError}
            action={
              <Button loading={reloadingMenu} onClick={() => void reloadMenuItems()}>
                Retry menu reload
              </Button>
            }
          />
        )}
        {creationNotice && !refreshError && (
          <Alert
            type="success"
            title="Category created successfully."
            showIcon
            closable
            onClose={() => setCreationNotice(false)}
          />
        )}
        {refreshError && (
          <Alert
            type="warning"
            title={refreshError}
            showIcon
            action={
              <Button onClick={() => void refreshCategories()} loading={refreshing}>
                Retry refresh
              </Button>
            }
          />
        )}
        <header className={styles.header}>
          <div>
            <div className={styles.titleRow}>
              <Typography.Title level={2} id="menu-management-heading" className={styles.title}>
                {selectedCategory ? `${selectedCategory.name} Menu` : 'Menu Management'}
              </Typography.Title>
              {selectedCategory && <Tag className={styles.configuredTag}>Window configured</Tag>}
            </div>
            <Typography.Text className={styles.subtitle}>
              {selectedCategory
                ? `${categoryItems.length} items · Ordering window: ${formatCategoryTime(selectedCategory.orderStartTime)} – ${formatCategoryTime(selectedCategory.orderCutoffTime)}`
                : 'Choose a meal category to review its menu items.'}
            </Typography.Text>
            {dataMode === 'fixtures' && (
              <div className={styles.previewNote} role="note">
                Fixture preview — sample data, not live menu records.
              </div>
            )}
          </div>
          <div className={styles.headerActions}>
            {selectedCategory && (
              <span className={styles.windowChip}>
                {formatCategoryTime(selectedCategory.orderStartTime)} –{' '}
                {formatCategoryTime(selectedCategory.orderCutoffTime)}
              </span>
            )}
            <Button
              icon={<ClockCircleOutlined aria-hidden="true" />}
              href={previewMode && selectedCategory ? '/time-windows' : undefined}
              disabled={(!onEditWindow && !previewMode) || !selectedCategory}
              onClick={() => selectedCategory && onEditWindow?.(selectedCategory.categoryId)}
              title={
                !onEditWindow && !previewMode
                  ? 'Window editing requires manager integration'
                  : undefined
              }
            >
              Edit Window
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined aria-hidden="true" />}
              disabled={(!onAddMenuItem && !canCreateMenu && !previewMode) || !selectedCategory}
              onClick={() => {
                if (!selectedCategory) return;
                if (canCreateMenu || previewMode)
                  setMenuModal({ mode: 'create', categoryId: selectedCategory.categoryId });
                else onAddMenuItem?.(selectedCategory.categoryId);
              }}
              title={
                !onAddMenuItem && !canCreateMenu && !previewMode
                  ? 'Menu creation requires authenticated API callbacks'
                  : undefined
              }
            >
              Add Menu Item
            </Button>
          </div>
        </header>

        {selectedCategory && (
          <div className={styles.filters}>
            <Input
              aria-label="Search menu items"
              placeholder="Search items by name..."
              prefix={<SearchOutlined aria-hidden="true" />}
              allowClear
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={styles.search}
              disabled={loadState !== 'ready'}
            />
            <div role="group" aria-label="Filter by stock status" className={styles.stockTabs}>
              {stockTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`${styles.stockTab} ${stockFilter === tab.value ? styles.activeStockTab : ''}`}
                  aria-pressed={stockFilter === tab.value}
                  disabled={loadState !== 'ready'}
                  onClick={() => setStockFilter(tab.value)}
                >
                  {tab.label} ({categoryCounts[tab.value]})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.results} aria-live="polite">
          {loadState === 'loading' ? (
            <div className={styles.statePanel} role="status">
              <Spin />
              <span>Loading menu items...</span>
            </div>
          ) : loadState === 'error' ? (
            <div className={styles.statePanel}>
              <Alert
                type="error"
                title="Menu could not be loaded"
                description={errorMessage}
                showIcon
                action={
                  <Button onClick={onRetry} disabled={!onRetry}>
                    Retry
                  </Button>
                }
              />
            </div>
          ) : !selectedCategory ? (
            <div className={styles.statePanel}>
              <Empty description="No meal categories available" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className={styles.statePanel}>
              <Empty
                description={
                  categoryItems.length === 0
                    ? 'No menu items in this category yet'
                    : 'No menu items match these filters'
                }
              />
            </div>
          ) : (
            <>
              <p className={styles.resultsSummary}>
                Showing {visibleItems.length} of {categoryItems.length} items
              </p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Allergens / Dietary</th>
                    <th scope="col">Price</th>
                    <th scope="col">Prep Time</th>
                    <th scope="col">Portion Limit</th>
                    <th scope="col">Stock Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.menuItemId}>
                      <td data-label="Item">
                        <div className={styles.itemCell}>
                          <span className={styles.itemThumb} aria-hidden="true">
                            <PictureOutlined />
                          </span>
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.description || 'No description provided'}</small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Allergens / Dietary">
                        <div className={styles.tagGroup}>
                          {(item.allergens ?? []).map((tag) => (
                            <Tag key={`allergen-${tag.name}`} color="error">
                              {tag.name}
                            </Tag>
                          ))}
                          {(item.dietaryLabels ?? []).map((tag) => (
                            <Tag key={`diet-${tag.name}`} color="success">
                              {tag.name}
                            </Tag>
                          ))}
                          {!item.allergens?.length && !item.dietaryLabels?.length && (
                            <span className={styles.muted}>No labels</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Price">
                        <span className={styles.price}>{item.price.toLocaleString('en-LK')}</span>
                      </td>
                      <td data-label="Prep Time">{item.preparationTime} min</td>
                      <td data-label="Portion Limit">{item.portionLimit}</td>
                      <td data-label="Stock Status">
                        <Tag
                          color={
                            getStockFilter(item.stockStatus) === 'AVAILABLE'
                              ? 'success'
                              : getStockFilter(item.stockStatus) === 'LOW_STOCK'
                                ? 'warning'
                                : 'error'
                          }
                        >
                          {stockLabels[item.stockStatus]}
                        </Tag>
                        <MenuStockActions
                          key={`${item.menuItemId}-${item.stockStatus}`}
                          item={item}
                          enabled={Boolean(
                            dataMode === 'api' && onChangeStockStatus && onReloadMenuItems,
                          )}
                          onUpdate={onChangeStockStatus}
                          onReload={reloadMenuItems}
                        />
                      </td>
                      <td data-label="Actions">
                        <Button
                          icon={<EditOutlined aria-hidden="true" />}
                          disabled={!onEditItem && !canUpdateMenu && !previewMode}
                          onClick={() => {
                            if (canUpdateMenu || previewMode) setMenuModal({ mode: 'edit', item });
                            else onEditItem?.(item);
                          }}
                          aria-label={`Edit ${item.name}`}
                          title={
                            !onEditItem ? 'Menu editing is planned for a later issue' : undefined
                          }
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.priceNote}>
                Prices show raw KMS integer values. Currency and unit interpretation require
                contract approval.
              </p>
            </>
          )}
        </div>
      </div>
      {menuModal && (
        <AddMenuItemModal
          key={menuModal.mode === 'create' ? 'new-item' : menuModal.item.menuItemId}
          open
          categories={currentCategories}
          initialCategoryId={menuModal.mode === 'create' ? menuModal.categoryId : undefined}
          item={menuModal.mode === 'edit' ? menuModal.item : undefined}
          allergens={allergenOptions}
          dietaryLabels={dietaryLabelOptions}
          onCancel={() => setMenuModal(null)}
          onSave={
            menuModal.mode === 'create' && canCreateMenu
              ? async (payload) => {
                  await onCreateMenuItem?.(payload);
                }
              : undefined
          }
          onUpdate={
            menuModal.mode === 'edit' && canUpdateMenu
              ? async (patch) => {
                  if (menuModal.mode !== 'edit') return;
                  await onUpdateMenuItem?.(menuModal.item.menuItemId, patch);
                  if (patch.categoryId) setSelectedCategoryId(patch.categoryId);
                }
              : undefined
          }
          onSaved={() => {
            setMenuModal(null);
            void reloadMenuItems();
          }}
        />
      )}
      {onCreateCategory && onRefreshCategories && modalOpen && (
        <AddCategoryModal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onCreate={async (payload) => {
            const created = await onCreateCategory(payload);
            createdCategoryId.current = created.categoryId;
          }}
          onCreated={() => {
            setModalOpen(false);
            void refreshCategories();
          }}
        />
      )}
    </section>
  );
}
