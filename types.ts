export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// Base for Driver and Customer
export interface BaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface Driver extends BaseUser {
  current_lat: number | null;
  current_lng: number | null;
}

export interface Customer extends BaseUser {}

export interface Admin extends BaseUser {}


export interface Delivery {
  id: string;
  customer_id: string;
  customer_name: string; // Kept for simplicity on some views, but new relations use customer object.
  origin_address: string;
  destination_address: string;
  status: DeliveryStatus;
  driver_id: string | null;
  created_at: string;
  // For joining with tables
  driver?: Driver | null;
  customer?: Customer | null;
}