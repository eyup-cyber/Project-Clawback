'use client';

/**
 * Categories Manager Component
 * Phase 2.7: CRUD, reorder, hierarchy, images
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string | null;
  image_url: string | null;
  parent_id: string | null;
  position: number;
  post_count: number;
  is_featured: boolean;
  is_visible: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  image_url: string;
  parent_id: string | null;
  is_featured: boolean;
  is_visible: boolean;
  seo_title: string;
  seo_description: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Category | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(buildCategoryTree(data.categories || []));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const handleCreate = async (data: CategoryFormData) => {
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        void fetchCategories();
        setShowFormModal(false);
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdate = async (id: string, data: CategoryFormData) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        void fetchCategories();
        setShowFormModal(false);
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        void fetchCategories();
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleReorder = async (categoryId: string, newPosition: number, newParentId: string | null) => {
    try {
      await fetch(`/api/admin/categories/${categoryId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: newPosition, parent_id: newParentId }),
      });
      void fetchCategories();
    } catch (error) {
      console.error('Failed to reorder category:', error);
    }
  };

  const handleDragStart = (category: Category) => {
    setDraggedCategory(category);
  };

  const handleDragOver = (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return;
  };

  const handleDrop = (e: React.DragEvent, targetCategory: Category, position: 'before' | 'after' | 'inside') => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return;

    let newParentId = targetCategory.parent_id;
    let newPosition = targetCategory.position;

    if (position === 'inside') {
      newParentId = targetCategory.id;
      newPosition = 0;
    } else if (position === 'after') {
      newPosition = targetCategory.position + 1;
    }

    void handleReorder(draggedCategory.id, newPosition, newParentId);
    setDraggedCategory(null);
  };

  const openCreateModal = (_parentId?: string) => {
    setSelectedCategory(null);
    setIsEditing(false);
    setShowFormModal(true);
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setIsEditing(true);
    setShowFormModal(true);
  };

  return (
    <div className="categories-manager">
      {/* Header */}
      <div className="header">
        <h1>Categories</h1>
        <button className="create-btn" onClick={() => openCreateModal()}>
          + New Category
        </button>
      </div>

      {/* Categories Tree */}
      <div className="categories-container">
        {loading ? (
          <div className="loading">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <p>No categories yet</p>
            <button onClick={() => openCreateModal()}>Create your first category</button>
          </div>
        ) : (
          <div className="categories-tree">
            {categories.map((category) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                level={0}
                onEdit={openEditModal}
                onDelete={setShowDeleteConfirm}
                onAddChild={(parentId) => {
                  setSelectedCategory({ parent_id: parentId } as Category);
                  setIsEditing(false);
                  setShowFormModal(true);
                }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedCategory?.id === category.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <CategoryFormModal
          category={selectedCategory}
          categories={flattenCategories(categories)}
          isEditing={isEditing}
          onClose={() => {
            setShowFormModal(false);
            setSelectedCategory(null);
          }}
          onSubmit={isEditing ? (data) => void handleUpdate(selectedCategory!.id, data) : (data) => void handleCreate(data)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          category={showDeleteConfirm}
          onConfirm={() => void handleDelete(showDeleteConfirm.id)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      <style jsx>{`
        .categories-manager {
          padding: 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .create-btn {
          padding: 0.5rem 1rem;
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .categories-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          min-height: 200px;
        }

        .loading,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text-muted, #6b7280);
        }

        .empty-state button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .categories-tree {
          padding: 1rem;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CategoryTreeItem({
  category,
  level,
  onEdit,
  onDelete,
  onAddChild,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  category: Category;
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddChild: (parentId: string) => void;
  onDragStart: (category: Category) => void;
  onDragOver: (e: React.DragEvent, category: Category) => void;
  onDrop: (e: React.DragEvent, category: Category, position: 'before' | 'after' | 'inside') => void;
  isDragging: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div
      className={`category-item ${isDragging ? 'dragging' : ''}`}
      style={{ marginLeft: `${level * 24}px` }}
    >
      <div
        className="category-row"
        draggable
        onDragStart={() => onDragStart(category)}
        onDragOver={(e) => onDragOver(e, category)}
        onDrop={(e) => onDrop(e, category, 'after')}
      >
        <div className="category-main">
          {hasChildren && (
            <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="expand-placeholder" />}
          
          <div className="category-icon" style={{ backgroundColor: category.color }}>
            {category.icon || category.name.charAt(0)}
          </div>
          
          <div className="category-info">
            <div className="category-name">
              {category.name}
              {category.is_featured && <span className="featured-badge">Featured</span>}
              {!category.is_visible && <span className="hidden-badge">Hidden</span>}
            </div>
            <div className="category-meta">
              /{category.slug} · {category.post_count} posts
            </div>
          </div>
        </div>

        <div className="category-actions">
          <button onClick={() => onAddChild(category.id)} title="Add Subcategory">
            ➕
          </button>
          <button onClick={() => onEdit(category)} title="Edit">
            ✏️
          </button>
          <button
            onClick={() => onDelete(category)}
            title="Delete"
            className="danger"
            disabled={hasChildren || category.post_count > 0}
          >
            🗑️
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="category-children">
          {category.children!.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              isDragging={isDragging}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .category-item.dragging {
          opacity: 0.5;
        }

        .category-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          border-radius: 8px;
          transition: background 0.2s;
          cursor: grab;
        }

        .category-row:hover {
          background: #f9fafb;
        }

        .category-main {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .expand-btn {
          width: 20px;
          height: 20px;
          padding: 0;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .expand-placeholder {
          width: 20px;
        }

        .category-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .category-info {
          flex: 1;
        }

        .category-name {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .featured-badge {
          padding: 0.125rem 0.5rem;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 999px;
          font-size: 0.625rem;
          font-weight: 500;
        }

        .hidden-badge {
          padding: 0.125rem 0.5rem;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 999px;
          font-size: 0.625rem;
          font-weight: 500;
        }

        .category-meta {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }

        .category-actions {
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .category-row:hover .category-actions {
          opacity: 1;
        }

        .category-actions button {
          padding: 0.25rem 0.5rem;
          border: none;
          background: none;
          cursor: pointer;
          opacity: 0.7;
        }

        .category-actions button:hover {
          opacity: 1;
        }

        .category-actions button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .category-actions button.danger:hover:not(:disabled) {
          background: #fee2e2;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

function CategoryFormModal({
  category,
  categories,
  isEditing,
  onClose,
  onSubmit,
}: {
  category: Category | null;
  categories: Category[];
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => void;
}) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    color: category?.color || '#3b82f6',
    icon: category?.icon || '',
    image_url: category?.image_url || '',
    parent_id: category?.parent_id || null,
    is_featured: category?.is_featured || false,
    is_visible: category?.is_visible ?? true,
    seo_title: category?.seo_title || '',
    seo_description: category?.seo_description || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (name: string) => {
    setFormData((f) => ({
      ...f,
      name,
      slug: f.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(formData);
    setSubmitting(false);
  };

  const colorPresets = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Category name"
                required
              />
            </div>
            <div className="form-group">
              <label>Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((f) => ({ ...f, slug: e.target.value }))}
                placeholder="category-slug"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description"
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((f) => ({ ...f, color: e.target.value }))}
                />
                <div className="color-presets">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-swatch ${formData.color === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData((f) => ({ ...f, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Icon (emoji)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData((f) => ({ ...f, icon: e.target.value }))}
                placeholder="📝"
                maxLength={2}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Parent Category</label>
            <select
              value={formData.parent_id || ''}
              onChange={(e) => setFormData((f) => ({ ...f, parent_id: e.target.value || null }))}
            >
              <option value="">None (Top Level)</option>
              {categories
                .filter((c) => c.id !== category?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? '— ' : ''}{c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Image URL</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="form-row checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData((f) => ({ ...f, is_featured: e.target.checked }))}
              />
              Featured
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_visible}
                onChange={(e) => setFormData((f) => ({ ...f, is_visible: e.target.checked }))}
              />
              Visible
            </label>
          </div>

          <details className="seo-section">
            <summary>SEO Settings</summary>
            <div className="form-group">
              <label>SEO Title</label>
              <input
                type="text"
                value={formData.seo_title}
                onChange={(e) => setFormData((f) => ({ ...f, seo_title: e.target.value }))}
                placeholder="Custom title for search engines"
              />
            </div>
            <div className="form-group">
              <label>SEO Description</label>
              <textarea
                value={formData.seo_description}
                onChange={(e) => setFormData((f) => ({ ...f, seo_description: e.target.value }))}
                placeholder="Custom description for search engines"
                rows={2}
              />
            </div>
          </details>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
          }

          .modal-header h2 {
            margin: 0;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
          }

          .modal-body {
            padding: 1.5rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .form-group {
            margin-bottom: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 0.25rem;
            font-weight: 500;
            font-size: 0.875rem;
          }

          .form-group input,
          .form-group textarea,
          .form-group select {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            font-family: inherit;
          }

          .color-picker {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .color-picker input[type="color"] {
            width: 40px;
            height: 32px;
            padding: 0;
            border: none;
            cursor: pointer;
          }

          .color-presets {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }

          .color-swatch {
            width: 16px;
            height: 16px;
            border-radius: 4px;
            border: 2px solid transparent;
            cursor: pointer;
          }

          .color-swatch.active {
            border-color: #1f2937;
          }

          .checkboxes {
            display: flex;
            gap: 1.5rem;
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
          }

          .seo-section {
            margin-top: 1rem;
            padding: 1rem;
            background: #f9fafb;
            border-radius: 8px;
          }

          .seo-section summary {
            cursor: pointer;
            font-weight: 500;
            margin-bottom: 1rem;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1.5rem;
          }

          .modal-actions button {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            background: white;
            cursor: pointer;
          }

          .modal-actions button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .modal-actions .primary {
            background: var(--primary-color, #3b82f6);
            color: white;
            border-color: var(--primary-color, #3b82f6);
          }
        `}</style>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  category,
  onConfirm,
  onCancel,
}: {
  category: Category;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Delete Category</h2>
        <p>
          Are you sure you want to delete <strong>{category.name}</strong>?
        </p>
        {category.post_count > 0 && (
          <p className="warning">
            ⚠️ This category has {category.post_count} posts. Move or reassign them first.
          </p>
        )}

        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} className="danger" disabled={category.post_count > 0}>
            Delete
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 400px;
            width: 90%;
            padding: 1.5rem;
          }

          h2 {
            margin: 0 0 0.5rem;
          }

          p {
            color: var(--text-muted, #6b7280);
          }

          .warning {
            padding: 0.75rem;
            background: #fef3c7;
            color: #92400e;
            border-radius: 8px;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1.5rem;
          }

          .modal-actions button {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            background: white;
            cursor: pointer;
          }

          .modal-actions .danger {
            background: #ef4444;
            color: white;
            border-color: #ef4444;
          }

          .modal-actions .danger:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  // Create map
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  // Build tree
  for (const cat of map.values()) {
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(cat);
    } else {
      roots.push(cat);
    }
  }

  // Sort by position
  const sortByPosition = (a: Category, b: Category) => a.position - b.position;
  roots.sort(sortByPosition);
  for (const cat of map.values()) {
    cat.children?.sort(sortByPosition);
  }

  return roots;
}

function flattenCategories(categories: Category[], result: Category[] = []): Category[] {
  for (const cat of categories) {
    result.push(cat);
    if (cat.children) {
      flattenCategories(cat.children, result);
    }
  }
  return result;
}
