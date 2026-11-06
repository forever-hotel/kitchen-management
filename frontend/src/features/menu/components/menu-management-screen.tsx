'use client';

import { Alert, Button, Empty, Input, Spin, Tag, Typography } from 'antd';
import { useMemo, useRef, useState } from 'react';

import type { KmsMealCategoryData } from '@/types/kms-menu';

import type { MenuManagementScreenProps, MenuStockFilter } from '../types/menu-management.type';
import {
  filterMenuItems,
  formatCategoryTime,
  getStockCounts,
  getStockFilter,
} from '../utils/menu-management.util';

import { AddCategoryModal } from './add-category-modal';
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
}: MenuManagementScreenProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<MenuStockFilter>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
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

  // Match the supplied Figma's Lunch-first preview when Lunch exists.
  const fallbackCategory =
    currentCategories.find((category) => category.name.trim().toLowerCase() === 'lunch') ??
    currentCategories[0];
  const selectedCategory =
    currentCategories.find((category) => category.categoryId === selectedCategoryId) ??
    fallbackCategory;

  const categoryItems = useMemo(
    () => items.filter((item) => item.categoryId === selectedCategory?.categoryId),
    [items, selectedCategory?.categoryId],
  );
  const categoryCounts = useMemo(() => getStockCounts(categoryItems), [categoryItems]);
  const visibleItems = useMemo(
    () =>
      selectedCategory
        ? filterMenuItems(items, selectedCategory.categoryId, searchQuery, stockFilter)
        : [],
    [items, selectedCategory, searchQuery, stockFilter],
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
            + Add Category
          </Button>
        </div>
        <div role="group" aria-label="Select meal category" className={styles.categoryList}>
          {currentCategories.map((category) => {
            const count = items.filter((item) => item.categoryId === category.categoryId).length;
            const isSelected = selectedCategory?.categoryId === category.categoryId;

            return (
              <button
                key={category.categoryId}
                type="button"
                className={`${styles.categoryButton} ${isSelected ? styles.selectedCategory : ''}`}
                aria-pressed={isSelected}
                onClick={() => selectCategory(category.categoryId)}
              >
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
              disabled={!onEditWindow || !selectedCategory}
              onClick={() => selectedCategory && onEditWindow?.(selectedCategory.categoryId)}
              title={!onEditWindow ? 'Window editing is planned for a later issue' : undefined}
            >
              Edit Window
            </Button>
            <Button
              type="primary"
              disabled={!onAddMenuItem || !selectedCategory}
              onClick={() => selectedCategory && onAddMenuItem?.(selectedCategory.categoryId)}
              title={!onAddMenuItem ? 'Menu item creation is planned for a later issue' : undefined}
            >
              + Add Menu Item
            </Button>
          </div>
        </header>

        {selectedCategory && (
          <div className={styles.filters}>
            <Input
              aria-label="Search menu items"
              placeholder="Search items by name..."
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
                            {item.name.charAt(0).toUpperCase()}
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
                      </td>
                      <td data-label="Actions">
                        <Button
                          disabled={!onEditItem}
                          onClick={() => onEditItem?.(item)}
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
