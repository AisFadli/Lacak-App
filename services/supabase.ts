import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Delivery, Driver, DeliveryStatus, Customer, User, UserRole, Admin } from '../types';

// IMPORTANT: Credentials are now read from .env file.
// In a Vite project, environment variables are accessed via `import.meta.env`.
// FIX: Cast `import.meta` to `any` to access Vite environment variables without TypeScript errors as type definitions are missing.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const useMock = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_SUPABASE_URL');

const initializeSupabase = (): SupabaseClient => {
    if (useMock) {
        console.warn(
            `Supabase credentials are not configured. Please create a .env file and add your credentials.
    App will run with mock data.`
        );
        // Return a dummy client. API functions check `useMock` and won't call methods on it,
        // except for subscription functions which are handled below.
        return {} as SupabaseClient;
    }
    return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = initializeSupabase();

/*
================================================================================
NOTE FOR USER: SUPABASE TABLE SETUP
================================================================================

You need to create the following tables in your Supabase project. You can use
the SQL Editor for this.

1. `admins` table:
   - id: uuid (primary key, default: uuid_generate_v4())
   - name: text
   - email: text (should be unique)
   - phone: text (nullable)
   - address: text (nullable)
   - password: text (NOT NULL)
   - created_at: timestamptz (default: now())

2. `customers` table:
   - id: uuid (primary key, default: uuid_generate_v4())
   - name: text
   - email: text (should be unique)
   - phone: text
   - address: text
   - password: text (NOT NULL)
   - created_at: timestamptz (default: now())

3. `drivers` table:
   - id: uuid (primary key, default: uuid_generate_v4())
   - name: text
   - email: text
   - phone: text
   - address: text
   - password: text (NOT NULL)
   - created_at: timestamptz (default: now())
   - current_lat: float8
   - current_lng: float8

4. `deliveries` table:
   - id: uuid (primary key, default: uuid_generate_v4())
   - customer_name: text (can be deprecated, but useful for quick display)
   - origin_address: text
   - destination_address: text
   - status: text (e.g., 'PENDING', 'IN_PROGRESS', 'DELIVERED')
   - created_at: timestamptz (default: now())
   - driver_id: uuid (foreign key to drivers.id)
   - customer_id: uuid (foreign key to customers.id)

ENABLE REALTIME:
- Go to Database > Replication and enable Realtime for `drivers` and `deliveries` tables.

ROW LEVEL SECURITY (RLS):
- For security, it's recommended to enable RLS on all tables.
- If RLS is enabled on the `customers` table, new users won't be able to register.
- **TO FIX REGISTRATION**, you MUST create a policy to allow public inserts.
- Run the following command in the Supabase SQL Editor:

  CREATE POLICY "Allow public insert for new customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (true);

================================================================================
*/


// --- MOCK DATA for fallback ---
const MOCK_ADMINS: Admin[] = [
    { id: 'admin-01', name: 'Admin Utama', email: 'admin@example.com', phone: 'N/A', address: 'N/A', created_at: new Date().toISOString() },
];

const MOCK_DRIVERS: Driver[] = [
    { id: 'd1', name: 'Budi Santoso', email: 'budi.s@example.com', phone: '081234567890', address: 'Jl. Merdeka 1, Jakarta', current_lat: -6.2088, current_lng: 106.8456, created_at: new Date().toISOString() },
    { id: 'd2', name: 'Citra Lestari', email: 'citra.l@example.com', phone: '081234567891', address: 'Jl. Sudirman 2, Jakarta', current_lat: -6.2188, current_lng: 106.8556, created_at: new Date().toISOString() },
];

const MOCK_CUSTOMERS: Customer[] = [
    { id: 'c1', name: 'Andi Wijaya', email: 'andi.w@example.com', phone: '085678901234', address: 'Jl. Gajah Mada 3, Jakarta', created_at: new Date().toISOString() },
    { id: 'c2', name: 'Siti Aminah', email: 'siti.a@example.com', phone: '085678901235', address: 'Jl. Pahlawan 4, Bandung', created_at: new Date().toISOString() },
];

const MOCK_DELIVERIES: Delivery[] = [
    { id: 'del1', customer_id: 'c2', customer_name: 'Siti Aminah', origin_address: 'Monas, Jakarta', destination_address: 'Bundaran HI, Jakarta', status: DeliveryStatus.IN_PROGRESS, driver_id: 'd1', created_at: new Date().toISOString() },
    { id: 'del2', customer_id: 'c1', customer_name: 'Andi Wijaya', origin_address: 'Blok M, Jakarta', destination_address: 'Kota Tua, Jakarta', status: DeliveryStatus.PENDING, driver_id: 'd2', created_at: new Date().toISOString() },
    { id: 'del3', customer_id: 'c2', customer_name: 'Siti Aminah', origin_address: 'Bandung', destination_address: 'Surabaya', status: DeliveryStatus.DELIVERED, driver_id: 'd1', created_at: new Date().toISOString() },
];

// --- API Functions ---

// Auth
export const loginUser = async (email: string, password: string): Promise<User | null> => {
    if (useMock) {
        const mockAdmin = MOCK_ADMINS.find(u => u.email === email);
        if (mockAdmin) {
            return { id: mockAdmin.id, name: mockAdmin.name, role: UserRole.ADMIN, email: mockAdmin.email };
        }
        const mockDriver = MOCK_DRIVERS.find(u => u.email === email);
        if (mockDriver) {
             return { id: mockDriver.id, name: mockDriver.name, role: UserRole.DRIVER, email: mockDriver.email };
        }
        const mockCustomer = MOCK_CUSTOMERS.find(u => u.email === email);
        if (mockCustomer) {
            return { id: mockCustomer.id, name: mockCustomer.name, role: UserRole.CUSTOMER, email: mockCustomer.email };
        }
        return null;
    }
    
    // Check admins table
    let { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle(); // FIX: Use maybeSingle to avoid 406 error on no result
        
    if (adminError) console.error("Admin login check failed:", adminError);
    if (adminData) {
        return {
            id: adminData.id,
            name: adminData.name,
            role: UserRole.ADMIN,
            email: adminData.email,
        };
    }

    // Check customers table
    let { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle(); // FIX: Use maybeSingle

    if (customerError) console.error("Customer login check failed:", customerError);
    if (customerData) {
        return {
            id: customerData.id,
            name: customerData.name,
            role: UserRole.CUSTOMER,
            email: customerData.email,
        };
    }

    // Check drivers table
    let { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle(); // FIX: Use maybeSingle
    
    if (driverError) console.error("Driver login check failed:", driverError);
    if (driverData) {
        return {
            id: driverData.id,
            name: driverData.name,
            role: UserRole.DRIVER,
            email: driverData.email,
        };
    }

    // If no user is found in any table
    console.log(`Login attempt failed for email: ${email}`);
    return null; 
}


// Deliveries
export const getDeliveries = async (): Promise<Delivery[]> => {
    if (useMock) return MOCK_DELIVERIES.map(d => ({...d, driver: MOCK_DRIVERS.find(dr => dr.id === d.driver_id), customer: MOCK_CUSTOMERS.find(c => c.id === d.customer_id)}));

    const { data, error } = await supabase
        .from('deliveries')
        .select(`
            *,
            driver:drivers(*),
            customer:customers(*)
        `)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching deliveries:', error);
        throw new Error('Failed to fetch deliveries.');
    }
    return data as Delivery[];
};

export const getDeliveriesForDriver = async (driverId: string): Promise<Delivery[]> => {
    if (useMock) return MOCK_DELIVERIES.filter(d => d.driver_id === driverId);

    const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching driver deliveries:', error);
        throw new Error('Failed to fetch deliveries for driver.');
    }
    return data;
};


export const getDeliveryForCustomer = async (customerId: string): Promise<Delivery | null> => {
    if (useMock) return { ...MOCK_DELIVERIES.find(d => d.customer_id === customerId)!, driver: MOCK_DRIVERS[0] };

    const { data, error } = await supabase
        .from('deliveries')
        .select('*, driver:drivers(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to gracefully handle no delivery
        
    if (error) {
        console.error('Error fetching customer delivery:', error);
        throw new Error('Failed to fetch delivery for customer.');
    }
    return data as Delivery | null;
}

export const updateDeliveryStatus = async (deliveryId: string, status: DeliveryStatus) => {
     if (useMock) {
        console.log(`Mock update status for ${deliveryId}: ${status}`);
        const delivery = MOCK_DELIVERIES.find(d => d.id === deliveryId);
        if(delivery) delivery.status = status;
        return;
    }

    const { error } = await supabase
        .from('deliveries')
        .update({ status: status })
        .eq('id', deliveryId);
    
    if (error) {
        console.error('Error updating delivery status:', error);
        throw new Error('Failed to update delivery status.');
    }
}

export interface NewDeliveryData {
    customer_id: string;
    driver_id: string;
    origin_address: string;
    destination_address: string;
    customer_name: string;
}

export const createDelivery = async (deliveryData: NewDeliveryData): Promise<Delivery> => {
    if (useMock) {
        const newDelivery: Delivery = {
            ...deliveryData,
            id: `del${Date.now()}`,
            created_at: new Date().toISOString(),
            status: DeliveryStatus.PENDING,
        };
        MOCK_DELIVERIES.unshift(newDelivery);
        return newDelivery;
    }

    const { data, error } = await supabase
        .from('deliveries')
        .insert({
            ...deliveryData,
            status: DeliveryStatus.PENDING,
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating delivery:', error);
        throw new Error('Failed to create delivery.');
    }

    return data as Delivery;
};


// Drivers
export const getAllDrivers = async (): Promise<Driver[]> => {
    if (useMock) return MOCK_DRIVERS;
    
    const { data, error } = await supabase
        .from('drivers')
        .select('*');

    if (error) {
        console.error('Error fetching drivers:', error);
        throw new Error('Failed to fetch drivers.');
    }
    return data;
};


export const updateDriverLocation = async (driverId: string, lat: number, lng: number) => {
    if (useMock) {
        console.log(`Mock update location for ${driverId}: ${lat}, ${lng}`);
        const driver = MOCK_DRIVERS.find(d => d.id === driverId);
        if (driver) {
            driver.current_lat = lat;
            driver.current_lng = lng;
        }
        return;
    }

    const { error } = await supabase
        .from('drivers')
        .update({ current_lat: lat, current_lng: lng })
        .eq('id', driverId);
    
    if (error) {
        console.error('Error updating driver location:', error);
        throw new Error('Failed to update driver location.');
    }
};

type DriverData = Omit<Driver, 'id' | 'created_at' | 'current_lat' | 'current_lng'> & { password?: string };

export const createDriver = async (driverData: DriverData) => {
    if (useMock) {
        const newDriver: Driver = { ...driverData, id: `d${Date.now()}`, created_at: new Date().toISOString(), current_lat: null, current_lng: null };
        MOCK_DRIVERS.push(newDriver);
        return newDriver;
    }
    const { data, error } = await supabase.from('drivers').insert(driverData).select().single();
    if (error) throw error;
    return data;
};

export const updateDriver = async (id: string, driverData: Partial<DriverData>) => {
    if (useMock) {
        const index = MOCK_DRIVERS.findIndex(d => d.id === id);
        if (index > -1) MOCK_DRIVERS[index] = { ...MOCK_DRIVERS[index], ...driverData };
        return MOCK_DRIVERS[index];
    }
    // Prevent updating password with an empty string
    if (driverData.password === '') {
        delete driverData.password;
    }
    const { data, error } = await supabase.from('drivers').update(driverData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteDriver = async (id: string) => {
    if (useMock) {
        const index = MOCK_DRIVERS.findIndex(d => d.id === id);
        if (index > -1) MOCK_DRIVERS.splice(index, 1);
        return;
    }
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) throw error;
};

// Customers
export const getAllCustomers = async (): Promise<Customer[]> => {
    if (useMock) return MOCK_CUSTOMERS;
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    return data;
};

type CustomerData = Omit<Customer, 'id' | 'created_at'> & { password?: string };

export const createCustomer = async (customerData: CustomerData): Promise<Customer> => {
    if (useMock) {
        const newCustomer: Customer = { ...customerData, id: `c${Date.now()}`, created_at: new Date().toISOString() };
        MOCK_CUSTOMERS.push(newCustomer);
        return newCustomer;
    }
    const { data, error } = await supabase.from('customers').insert(customerData).select().single();
    if (error) throw error;
    return data as Customer;
};

export const updateCustomer = async (id: string, customerData: Partial<CustomerData>) => {
    if (useMock) {
        const index = MOCK_CUSTOMERS.findIndex(c => c.id === id);
        if (index > -1) MOCK_CUSTOMERS[index] = { ...MOCK_CUSTOMERS[index], ...customerData };
        return MOCK_CUSTOMERS[index];
    }
     // Prevent updating password with an empty string
    if (customerData.password === '') {
        delete customerData.password;
    }
    const { data, error } = await supabase.from('customers').update(customerData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteCustomer = async (id: string) => {
    if (useMock) {
        const index = MOCK_CUSTOMERS.findIndex(c => c.id === id);
        if (index > -1) MOCK_CUSTOMERS.splice(index, 1);
        return;
    }
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
};


// Admins
export const getAllAdmins = async (): Promise<Admin[]> => {
    if (useMock) return MOCK_ADMINS;
    const { data, error } = await supabase.from('admins').select('*');
    if (error) throw error;
    return data;
};

type AdminData = Omit<Admin, 'id' | 'created_at'> & { password?: string };

export const createAdmin = async (adminData: AdminData) => {
    if (useMock) {
        const newAdmin: Admin = { ...adminData, id: `a${Date.now()}`, created_at: new Date().toISOString() };
        MOCK_ADMINS.push(newAdmin);
        return newAdmin;
    }
    const { data, error } = await supabase.from('admins').insert(adminData).select().single();
    if (error) throw error;
    return data;
};

export const updateAdmin = async (id: string, adminData: Partial<AdminData>) => {
    if (useMock) {
        const index = MOCK_ADMINS.findIndex(a => a.id === id);
        if (index > -1) MOCK_ADMINS[index] = { ...MOCK_ADMINS[index], ...adminData };
        return MOCK_ADMINS[index];
    }
    if (adminData.password === '') {
        delete adminData.password;
    }
    const { data, error } = await supabase.from('admins').update(adminData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteAdmin = async (id: string) => {
    if (useMock) {
        const index = MOCK_ADMINS.findIndex(a => a.id === id);
        if (index > -1) MOCK_ADMINS.splice(index, 1);
        return;
    }
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (error) throw error;
};


// Realtime Subscriptions
export const subscribeToAllDrivers = (callback: (payload: any) => void): RealtimeChannel => {
    if (useMock) {
        // Return a dummy channel that does nothing but has an unsubscribe method
        // to prevent errors in useEffect cleanup functions.
        return {
            unsubscribe: () => {},
        } as unknown as RealtimeChannel;
    }
    const channel = supabase
        .channel('all-drivers-channel')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers' }, callback)
        .subscribe();
    
    return channel;
};


export const subscribeToDriverLocation = (driverId: string, callback: (payload: any) => void): RealtimeChannel => {
    if (useMock) {
        // Return a dummy channel for mock mode.
        return {
            unsubscribe: () => {},
        } as unknown as RealtimeChannel;
    }
    const channel = supabase
        .channel(`driver-${driverId}-location`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` },
            callback
        )
        .subscribe();
    return channel;
}