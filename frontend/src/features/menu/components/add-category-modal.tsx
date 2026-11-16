'use client';

import { Alert, Input, Modal } from 'antd';
import { useState } from 'react';

import type { CreateCategoryInput } from '../utils/create-category.validation';
import {
  normalizeCreateCategory,
  validateCreateCategory,
} from '../utils/create-category.validation';

interface AddCategoryModalProps {
  open: boolean;
  onCancel: () => void;
  onCreate: (input: CreateCategoryInput) => Promise<void>;
  onCreated: () => void;
}

const emptyCategory: CreateCategoryInput = {
  name: '',
  orderStartTime: '',
  orderCutoffTime: '',
};

function readableSubmitError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const response = error as { status?: unknown; message?: unknown };
    if (response.status === 409) return 'A category with this name already exists.';
    if (response.status === 401) return 'Your session expired. Sign in and try again.';
    if (response.status === 403) return 'Only Kitchen Managers can create categories.';
    if (response.status === 400) return 'Please check the category name and ordering times.';
    if (typeof response.message === 'string' && response.message.length < 240) {
      return response.message;
    }
  }
  return 'Unable to create the category. Please retry.';
}

/**
 * R-06 modal. The surrounding screen mounts this component only while open,
 * so a fresh form starts empty after cancellation without a reset effect.
 * Native form state avoids rc-field-form's browser-only watch scheduler in Jest.
 */
export function AddCategoryModal({ open, onCancel, onCreate, onCreated }: AddCategoryModalProps) {
  const [fields, setFields] = useState<CreateCategoryInput>(emptyCategory);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateField(field: keyof CreateCategoryInput, value: string): void {
    setFields((current) => ({ ...current, [field]: value }));
    setValidationError(null);
    setSubmitError(null);
  }

  function handleCancel(): void {
    if (submitting) return;
    onCancel();
  }

  async function handleSubmit(): Promise<void> {
    if (submitting) return;

    const reason = validateCreateCategory(fields);
    if (reason) {
      setValidationError(reason);
      return;
    }

    setValidationError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onCreate(normalizeCreateCategory(fields));
      onCreated();
    } catch (error) {
      setSubmitError(readableSubmitError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Add Category"
      open={open}
      okText="Create Category"
      okButtonProps={{ loading: submitting }}
      cancelButtonProps={{ disabled: submitting }}
      closable={!submitting}
      mask={{ closable: !submitting }}
      keyboard={!submitting}
      onOk={() => void handleSubmit()}
      onCancel={handleCancel}
      destroyOnHidden
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="kms-new-category-name" style={{ display: 'block', marginBottom: 6 }}>
            Category name
          </label>
          <Input
            id="kms-new-category-name"
            name="name"
            required
            maxLength={101}
            autoComplete="off"
            placeholder="e.g. Breakfast"
            value={fields.name}
            disabled={submitting}
            onChange={(event) => updateField('name', event.target.value)}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="kms-new-category-start" style={{ display: 'block', marginBottom: 6 }}>
            Order start time
          </label>
          <Input
            id="kms-new-category-start"
            name="orderStartTime"
            required
            placeholder="06:30"
            autoComplete="off"
            value={fields.orderStartTime}
            disabled={submitting}
            onChange={(event) => updateField('orderStartTime', event.target.value)}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="kms-new-category-cutoff" style={{ display: 'block', marginBottom: 6 }}>
            Order cutoff time
          </label>
          <Input
            id="kms-new-category-cutoff"
            name="orderCutoffTime"
            required
            placeholder="10:00"
            autoComplete="off"
            value={fields.orderCutoffTime}
            disabled={submitting}
            onChange={(event) => updateField('orderCutoffTime', event.target.value)}
          />
        </div>
        {validationError && (
          <Alert
            type="error"
            showIcon
            role="alert"
            title={validationError}
            style={{ marginBottom: 12 }}
          />
        )}
        {submitError && (
          <Alert
            type="error"
            showIcon
            role="alert"
            title={submitError}
            style={{ marginBottom: 12 }}
          />
        )}
      </form>
    </Modal>
  );
}
