import { ReactNode } from "react";
import { StaticImport } from "next/dist/shared/lib/get-img-props";

// MHE Bazar Type Definitions

export type Product = {
  status: string;
  currency: ReactNode;
  image: string | StaticImport;
  subtitle: ReactNode;
  title: string;
  id: number;
  category: number;
  category_name: string;
  subcategory: number;
  subcategory_name: string;
  name: string;
  description: string;
  meta_title: string;
  meta_description: string;
  manufacturer: string;
  model: string;
  price: string;
  type: string;
  brochure: string | null;
  offer: string | null;
  images: Array<{
    id: number;
    image: string;
    product: number;
  }>;
  is_active: boolean;
  direct_sale: boolean;
  hide_price: boolean;
  online_payment: boolean;
  stock_quantity: number;
  average_rating: number | null;
  product_details: string;
  created_at: string;
  updated_at: string;
  user: number;
  user_name: string;
};

export type Vendor = {
  id: number;
  brand: string;
  username: string;
  email: string;
  full_name: string;
  company_name: string;
  company_email: string;
  user_info: {
    id: number;
    profile_photo: string;
  };
  is_approved: boolean;
  application_date: string;
};

export interface Category {
  id: number;
  name: string;
  description?: string;
  cat_image?: string;
  cat_banner?: string;
  subcategories?: Subcategory[];
  product_count?: number;
  product_details: ProductDetailField[];
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'vendor' | 'admin';
  company?: string;
  address?: string;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  isRental: boolean;
  rentalPeriod?: number; // in days
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  updatedAt: Date;
}

export interface InquiryForm {
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string;
  message: string;
  inquiryType: 'purchase' | 'rental' | 'quote';
  preferredContactMethod: 'email' | 'phone';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface FilterOptions {
  categories?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  brands?: string[];
  availability?: 'available' | 'rental' | 'all';
  sortBy?: 'name' | 'price' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams {
  query?: string;
  category?: string;
  subcategory?: string;
  filters?: FilterOptions;
  page?: number;
  limit?: number;
}

// MHE Equipment specific types
export interface EquipmentSpecifications {
  capacity?: string;
  liftHeight?: string;
  powerSource?: 'electric' | 'diesel' | 'lpg' | 'manual';
  brand: string;
  model: string;
  year?: number;
  condition?: 'new' | 'used' | 'refurbished';
  warranty?: string;
}

export interface MHEProduct extends Omit<Product, 'specifications'> {
  specifications: EquipmentSpecifications;
  attachments?: string[];
  maintenanceSchedule?: string;
  operatorManual?: string;
  safetyFeatures?: string[];
}

export interface GoogleLoginButtonProps {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
  // Customization props
  variant?: "default" | "custom";
  buttonText?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  theme?: "light" | "dark";
  showIcon?: boolean;
  fallbackMessage?: React.ReactNode;
}

export type StatsCardProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  number: string | number;
  label: string;
  color?: string;
};

export type ProductQuote = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  company: string;
  product: string;
  date: string;
};

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProductDetailField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: FieldOption[];
  placeholder?: string;
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  cat_image?: FileList;
  cat_banner?: FileList;
  product_details: ProductDetailField[];
}

export interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface ProductDetailField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: FieldOption[];
  placeholder?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  cat_image?: string;
  cat_banner?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Subcategory {
  id: number;
  category: number;
  category_name: string;
  name: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  sub_image?: string;
  sub_banner?: string;
  product_details: ProductDetailField[] | null;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface SubcategoryFormData {
  category: string;
  name: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  sub_image?: FileList;
  sub_banner?: FileList;
  product_details: ProductDetailField[];
}