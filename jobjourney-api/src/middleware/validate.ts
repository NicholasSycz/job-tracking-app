import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

// Schema definition types
interface StringField {
  type: 'string';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: string[];
}

interface NumberField {
  type: 'number';
  required?: boolean;
  min?: number;
  max?: number;
}

interface BooleanField {
  type: 'boolean';
  required?: boolean;
}

interface DateField {
  type: 'date';
  required?: boolean;
}

type SchemaField = StringField | NumberField | BooleanField | DateField;

export interface ValidationSchema {
  [key: string]: SchemaField;
}

interface ValidationErrors {
  [key: string]: string;
}

function validateField(
  key: string,
  value: unknown,
  field: SchemaField
): string | null {
  // Check required
  if (field.required && (value === undefined || value === null || value === '')) {
    return `${key} is required`;
  }

  // Skip validation if not required and empty
  if (!field.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  switch (field.type) {
    case 'string': {
      if (typeof value !== 'string') {
        return `${key} must be a string`;
      }
      if (field.minLength && value.length < field.minLength) {
        return `${key} must be at least ${field.minLength} characters`;
      }
      if (field.maxLength && value.length > field.maxLength) {
        return `${key} must be at most ${field.maxLength} characters`;
      }
      if (field.pattern && !field.pattern.test(value)) {
        return `${key} has invalid format`;
      }
      if (field.enum && !field.enum.includes(value)) {
        return `${key} must be one of: ${field.enum.join(', ')}`;
      }
      break;
    }
    case 'number': {
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);
      if (isNaN(numValue)) {
        return `${key} must be a number`;
      }
      if (field.min !== undefined && numValue < field.min) {
        return `${key} must be at least ${field.min}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `${key} must be at most ${field.max}`;
      }
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return `${key} must be a boolean`;
      }
      break;
    }
    case 'date': {
      const date = new Date(value as string);
      if (isNaN(date.getTime())) {
        return `${key} must be a valid date`;
      }
      break;
    }
  }

  return null;
}

export function validate(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: ValidationErrors = {};
    const body = req.body || {};

    for (const [key, field] of Object.entries(schema)) {
      const error = validateField(key, body[key], field);
      if (error) {
        errors[key] = error;
      }
    }

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      throw new ValidationError(firstError, { fields: errors });
    }

    next();
  };
}

// Pre-defined schemas for common operations
export const schemas = {
  signup: {
    email: {
      type: 'string' as const,
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: 'string' as const,
      required: true,
      minLength: 6,
      maxLength: 100,
    },
    name: {
      type: 'string' as const,
      required: false,
      maxLength: 100,
    },
  },

  login: {
    email: {
      type: 'string' as const,
      required: true,
    },
    password: {
      type: 'string' as const,
      required: true,
    },
  },

  createApplication: {
    company: {
      type: 'string' as const,
      required: true,
      minLength: 1,
      maxLength: 200,
    },
    role: {
      type: 'string' as const,
      required: true,
      minLength: 1,
      maxLength: 200,
    },
    status: {
      type: 'string' as const,
      required: false,
      enum: ['INTERESTED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'GHOSTED'],
    },
    dateApplied: {
      type: 'date' as const,
      required: false,
    },
    description: {
      type: 'string' as const,
      required: false,
      maxLength: 10000,
    },
    location: {
      type: 'string' as const,
      required: false,
      maxLength: 200,
    },
    salary: {
      type: 'string' as const,
      required: false,
      maxLength: 100,
    },
    link: {
      type: 'string' as const,
      required: false,
      maxLength: 500,
    },
    notes: {
      type: 'string' as const,
      required: false,
      maxLength: 5000,
    },
    source: {
      type: 'string' as const,
      required: false,
      maxLength: 50,
    },
    externalJobId: {
      type: 'string' as const,
      required: false,
      maxLength: 200,
    },
    followUpDate: {
      type: 'date' as const,
      required: false,
    },
    reminderEnabled: {
      type: 'boolean' as const,
      required: false,
    },
    interviewDate: {
      type: 'date' as const,
      required: false,
    },
    interviewReminderEnabled: {
      type: 'boolean' as const,
      required: false,
    },
  },

  updateApplication: {
    company: {
      type: 'string' as const,
      required: false,
      minLength: 1,
      maxLength: 200,
    },
    role: {
      type: 'string' as const,
      required: false,
      minLength: 1,
      maxLength: 200,
    },
    status: {
      type: 'string' as const,
      required: false,
      enum: ['INTERESTED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'GHOSTED'],
    },
    dateApplied: {
      type: 'date' as const,
      required: false,
    },
    description: {
      type: 'string' as const,
      required: false,
      maxLength: 10000,
    },
    location: {
      type: 'string' as const,
      required: false,
      maxLength: 200,
    },
    salary: {
      type: 'string' as const,
      required: false,
      maxLength: 100,
    },
    link: {
      type: 'string' as const,
      required: false,
      maxLength: 500,
    },
    notes: {
      type: 'string' as const,
      required: false,
      maxLength: 5000,
    },
    source: {
      type: 'string' as const,
      required: false,
      maxLength: 50,
    },
    externalJobId: {
      type: 'string' as const,
      required: false,
      maxLength: 200,
    },
    followUpDate: {
      type: 'date' as const,
      required: false,
    },
    reminderEnabled: {
      type: 'boolean' as const,
      required: false,
    },
    interviewDate: {
      type: 'date' as const,
      required: false,
    },
    interviewReminderEnabled: {
      type: 'boolean' as const,
      required: false,
    },
  },

  updateProfile: {
    name: {
      type: 'string' as const,
      required: false,
      maxLength: 100,
    },
  },

  forgotPassword: {
    email: {
      type: 'string' as const,
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },

  resetPassword: {
    token: {
      type: 'string' as const,
      required: true,
      minLength: 1,
    },
    password: {
      type: 'string' as const,
      required: true,
      minLength: 6,
      maxLength: 100,
    },
  },
};
