import { z } from "zod";

// Client validation schema
export const clientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  company: z.string().max(100, "Company name too long").optional(),
  address: z.string().max(500, "Address too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// Invoice item validation schema
export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0").max(9999, "Quantity too large"),
  unit_price: z.number().min(0, "Unit price cannot be negative").max(999999, "Unit price too large"),
  amount: z.number().optional(),
  position: z.number().int().min(1).optional(),
});

export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;

// Invoice validation schema
export const invoiceSchema = z.object({
  number: z.string().min(1, "Invoice number is required").max(50, "Invoice number too long"),
  client_id: z.string().uuid("Please select a client"),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"], {
    errorMap: () => ({ message: "Invalid status" }),
  }),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  tax: z.number().min(0, "Tax cannot be negative"),
  total: z.number().min(0, "Total cannot be negative"),
  notes: z.string().max(1000, "Notes too long").optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

// User settings validation schema
export const userSettingsSchema = z.object({
  display_name: z.string().max(100, "Display name too long").optional(),
  company_name: z.string().max(100, "Company name too long").optional(),
  company_logo_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().max(500, "Address too long").optional(),
  phone: z.string().max(20, "Phone number too long").optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  currency: z.string().min(3, "Currency code required").max(3, "Invalid currency code"),
  tax_rate: z.number().min(0, "Tax rate cannot be negative").max(100, "Tax rate cannot exceed 100%").optional(),
  invoice_terms: z.string().max(1000, "Invoice terms too long").optional(),
  invoice_footer: z.string().max(500, "Invoice footer too long").optional(),
});

export type UserSettingsFormData = z.infer<typeof userSettingsSchema>;

// Recurring invoice validation schema
export const recurringInvoiceSchema = z.object({
  client_id: z.string().uuid("Please select a client"),
  template_number: z.string().min(1, "Template number is required").max(50, "Template number too long"),
  frequency: z.enum(["weekly", "monthly", "quarterly", "annually"], {
    errorMap: () => ({ message: "Invalid frequency" }),
  }),
  next_due_date: z.string().min(1, "Next due date is required"),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  tax: z.number().min(0, "Tax cannot be negative"),
  total: z.number().min(0, "Total cannot be negative"),
  notes: z.string().max(1000, "Notes too long").optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export type RecurringInvoiceFormData = z.infer<typeof recurringInvoiceSchema>;

// Authentication validation schemas
export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;

// Helper function to format validation errors
export const formatValidationErrors = (error: z.ZodError) => {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};

// Helper function to validate and return formatted errors
export const validateWithErrors = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: formatValidationErrors(result.error),
      data: null,
    };
  }
  return {
    success: true,
    errors: [],
    data: result.data,
  };
};
