/**
 * Client-side Form Validation Utilities
 * React hooks and utilities for form validation on the client side
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { validateData, ValidationResult, ValidationError } from './utils';

export interface FormState<T> {
  data: Partial<T>;
  errors: Record<string, string>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  initialData?: Partial<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * React hook for form validation with Zod schemas
 */
export const useFormValidation = <T extends Record<string, any>>(
  options: UseFormValidationOptions<T>
) => {
  const { schema, initialData = {}, validateOnChange = false, validateOnBlur = true } = options;

  const [formState, setFormState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    isValid: false,
    isSubmitting: false,
    isDirty: false,
  });

  // Validate a single field
  const validateField = useCallback((name: keyof T, value: any): string | undefined => {
    try {
      // Create a partial schema for the specific field
      const fieldSchema = schema.pick({ [name]: true } as any);
      fieldSchema.parse({ [name]: value });
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message;
      }
      return 'Validation error';
    }
  }, [schema]);

  // Validate entire form
  const validateForm = useCallback((data: Partial<T>): ValidationResult<T> => {
    return validateData(schema, data);
  }, [schema]);

  // Update field value
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setFormState(prev => {
      const newData = { ...prev.data, [name]: value };
      const newErrors = { ...prev.errors };

      // Remove existing error for this field
      delete newErrors[name as string];

      // Validate on change if enabled
      if (validateOnChange) {
        const fieldError = validateField(name, value);
        if (fieldError) {
          newErrors[name as string] = fieldError;
        }
      }

      const validation = validateForm(newData);

      return {
        ...prev,
        data: newData,
        errors: newErrors,
        isValid: validation.success,
        isDirty: true,
      };
    });
  }, [validateField, validateForm, validateOnChange]);

  // Handle field blur
  const handleFieldBlur = useCallback((name: keyof T) => {
    if (!validateOnBlur) return;

    setFormState(prev => {
      const fieldError = validateField(name, prev.data[name]);
      const newErrors = { ...prev.errors };

      if (fieldError) {
        newErrors[name as string] = fieldError;
      } else {
        delete newErrors[name as string];
      }

      const validation = validateForm(prev.data);

      return {
        ...prev,
        errors: newErrors,
        isValid: validation.success,
      };
    });
  }, [validateField, validateForm, validateOnBlur]);

  // Set multiple field values
  const setFieldValues = useCallback((values: Partial<T>) => {
    setFormState(prev => {
      const newData = { ...prev.data, ...values };
      const validation = validateForm(newData);

      return {
        ...prev,
        data: newData,
        errors: validation.success ? {} : prev.errors,
        isValid: validation.success,
        isDirty: true,
      };
    });
  }, [validateForm]);

  // Set form errors
  const setErrors = useCallback((errors: Record<string, string>) => {
    setFormState(prev => ({
      ...prev,
      errors,
      isValid: Object.keys(errors).length === 0,
    }));
  }, []);

  // Clear form errors
  const clearErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      errors: {},
      isValid: validateForm(prev.data).success,
    }));
  }, [validateForm]);

  // Reset form
  const reset = useCallback((newData?: Partial<T>) => {
    const resetData = newData || initialData;
    setFormState({
      data: resetData,
      errors: {},
      isValid: validateForm(resetData).success,
      isSubmitting: false,
      isDirty: false,
    });
  }, [initialData, validateForm]);

  // Submit form
  const handleSubmit = useCallback(async (
    onSubmit: (data: T) => Promise<void> | void
  ) => {
    const validation = validateForm(formState.data);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.errors?.forEach(error => {
        errors[error.field] = error.message;
      });
      setErrors(errors);
      return false;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      await onSubmit(validation.data!);
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState.data, validateForm, setErrors]);

  // Get field props for easy integration with form inputs
  const getFieldProps = useCallback((name: keyof T) => ({
    value: formState.data[name] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFieldValue(name, e.target.value);
    },
    onBlur: () => handleFieldBlur(name),
    error: formState.errors[name as string],
    'aria-invalid': !!formState.errors[name as string],
  }), [formState.data, formState.errors, setFieldValue, handleFieldBlur]);

  return {
    ...formState,
    setFieldValue,
    setFieldValues,
    setErrors,
    clearErrors,
    reset,
    handleSubmit,
    getFieldProps,
    validateField,
    validateForm,
  };
};

/**
 * Hook for real-time field validation
 */
export const useFieldValidation = <T>(
  schema: z.ZodSchema<T>,
  fieldName: keyof T
) => {
  const [error, setError] = useState<string | undefined>();

  const validate = useCallback((value: any) => {
    try {
      const fieldSchema = schema.pick({ [fieldName]: true } as any);
      fieldSchema.parse({ [fieldName]: value });
      setError(undefined);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0]?.message);
      } else {
        setError('Validation error');
      }
      return false;
    }
  }, [schema, fieldName]);

  return { error, validate };
};

/**
 * Utility to convert Zod errors to form-friendly format
 */
export const zodErrorsToFormErrors = (error: z.ZodError): Record<string, string> => {
  const formErrors: Record<string, string> = {};
  
  error.errors.forEach(err => {
    const field = err.path.join('.');
    if (!formErrors[field]) {
      formErrors[field] = err.message;
    }
  });

  return formErrors;
};

/**
 * Validates form data and returns formatted errors
 */
export const validateFormData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { isValid: boolean; errors: Record<string, string>; data?: T } => {
  try {
    const validData = schema.parse(data);
    return {
      isValid: true,
      errors: {},
      data: validData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: zodErrorsToFormErrors(error),
      };
    }
    return {
      isValid: false,
      errors: { general: 'Validation failed' },
    };
  }
};

/**
 * Creates a debounced validation function
 */
export const useDebouncedValidation = <T>(
  schema: z.ZodSchema<T>,
  delay: number = 300
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(
    debounce((data: Partial<T>) => {
      setIsValidating(true);
      const result = validateFormData(schema, data);
      setErrors(result.errors);
      setIsValidating(false);
    }, delay),
    [schema, delay]
  );

  return { errors, isValidating, validate };
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}