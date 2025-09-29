import React, { useState, useEffect, useCallback } from 'react';
import { Delivery, Driver, Customer } from '../types';
import { 
    getDeliveries, 
    getAllDrivers, 
    subscribeToAllDrivers, 
    getAllCustomers, 
    createDriver, 
    updateDriver, 
    deleteDriver, 
    createCustomer, 
    updateCustomer,
    deleteCustomer
} from '../services/supabase';
import MapWrapper from '../components/MapWrapper';
import { useToast } from '../contexts/ToastContext';
import { ToastType } from '../components/Toast';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/Icons';

type ActiveTab = 'deliveries' | 'drivers' | 'customers';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('deliveries');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [deliveriesData, driversData, customersData] = await Promise.all([
        getDeliveries(), 
        getAllDrivers(),
        getAllCustomers()
      ]);
      setDeliveries(deliveriesData);
      setDrivers(driversData);
      setCustomers(customersData);
    } catch (error) {
      console.error(error);
      addToast('Gagal memuat data dashboard.', ToastType.ERROR);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const subscription = subscribeToAllDrivers((payload) => {
      const updatedDriver = payload.new as Driver;
      setDrivers(prevDrivers => 
        prevDrivers.map(d => d.id === updatedDriver.id ? updatedDriver : d)
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-200 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-200 text-blue-800';
      case 'DELIVERED': return 'bg-green-200 text-green-800';
      case 'CANCELLED': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const mapMarkers = drivers
    .filter(d => d.current_lat && d.current_lng)
    .map(d => ({
      id: d.id,
      lng: d.current_lng!,
      lat: d.current_lat!,
      color: '#EF4444',
      popupContent: `<strong class="text-sm">${d.name}</strong>`
    }));
    
    const handleUserCrud = async (action: () => Promise<any>, successMessage: string, errorMessage: string) => {
        try {
            await action();
            addToast(successMessage, ToastType.SUCCESS);
            fetchData(); // Refresh all data
        } catch (error) {
            console.error(error);
            addToast(errorMessage, ToastType.ERROR);
        }
    };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Peta Pelacakan Driver</h2>
        <div className="h-96 w-full bg-gray-200 dark:bg-gray-800 rounded-xl shadow-lg">
          <MapWrapper markers={mapMarkers} />
        </div>
      </div>
      
      <div>
        <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <TabButton name="Pengiriman" activeTab={activeTab} onClick={() => setActiveTab('deliveries')} />
                <TabButton name="Driver" activeTab={activeTab} onClick={() => setActiveTab('drivers')} />
                <TabButton name="Pelanggan" activeTab={activeTab} onClick={() => setActiveTab('customers')} />
            </nav>
        </div>
        
        <div className="mt-6">
            {loading ? <div className="p-8 text-center">Memuat data...</div> : (
                <>
                    {activeTab === 'deliveries' && <DeliveriesTable deliveries={deliveries} getStatusColor={getStatusColor} />}
                    {activeTab === 'drivers' && <UserManagementPanel users={drivers} userType="Driver" onCrud={handleUserCrud} />}
                    {activeTab === 'customers' && <UserManagementPanel users={customers} userType="Pelanggan" onCrud={handleUserCrud} />}
                </>
            )}
        </div>
      </div>

    </div>
  );
};

// --- Sub-components for AdminDashboard ---

const TabButton: React.FC<{name: string, activeTab: ActiveTab, onClick: () => void}> = ({ name, activeTab, onClick }) => {
    const id = name.toLowerCase();
    const isActive = activeTab === id;
    return (
        <button
            onClick={onClick}
            className={`${
                isActive
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
            {name}
        </button>
    )
}

const DeliveriesTable: React.FC<{ deliveries: Delivery[], getStatusColor: (s: string) => string }> = ({ deliveries, getStatusColor }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pelanggan</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Driver</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tujuan</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{delivery.customer?.name || delivery.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{delivery.driver?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{delivery.destination_address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                          {delivery.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
        </div>
    </div>
);

const UserManagementPanel: React.FC<{ users: (Driver | Customer)[], userType: 'Driver' | 'Pelanggan', onCrud: (action: () => Promise<any>, successMessage: string, errorMessage: string) => void }> = ({ users, userType, onCrud }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Driver | Customer | null>(null);

    const openModalForNew = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openModalForEdit = (user: Driver | Customer) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };
    
    const handleDelete = (user: Driver | Customer) => {
        if (window.confirm(`Anda yakin ingin menghapus ${userType} ${user.name}?`)) {
            const action = userType === 'Driver' ? () => deleteDriver(user.id) : () => deleteCustomer(user.id);
            onCrud(action, `${userType} berhasil dihapus.`, `Gagal menghapus ${userType}.`);
        }
    };
    
    const handleFormSubmit = (formData: Omit<Driver, 'id' | 'created_at' | 'current_lat' | 'current_lng'>) => {
        const isEditing = !!editingUser;
        const action = isEditing
            ? (userType === 'Driver' ? () => updateDriver(editingUser!.id, formData) : () => updateCustomer(editingUser!.id, formData))
            : (userType === 'Driver' ? () => createDriver(formData) : () => createCustomer(formData as Omit<Customer, 'id' | 'created_at'>));
            
        const successMessage = isEditing ? `${userType} berhasil diperbarui.` : `${userType} berhasil ditambahkan.`;
        const errorMessage = isEditing ? `Gagal memperbarui ${userType}.` : `Gagal menambahkan ${userType}.`;
        
        onCrud(action, successMessage, errorMessage);
        setIsModalOpen(false);
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">Daftar {userType}</h3>
                <button onClick={openModalForNew} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition duration-300">
                    <PlusIcon className="h-5 w-5" /> Tambah {userType}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                     <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Telepon</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Alamat</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.address}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={() => openModalForEdit(user)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => handleDelete(user)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {isModalOpen && <UserFormModal user={editingUser} userType={userType} onClose={() => setIsModalOpen(false)} onSubmit={handleFormSubmit} />}
        </div>
    );
};

const UserFormModal: React.FC<{ user: Driver | Customer | null, userType: 'Driver' | 'Pelanggan', onClose: () => void, onSubmit: (data: any) => void }> = ({ user, userType, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">{user ? 'Edit' : 'Tambah'} {userType}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telepon</label>
                        <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                     <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alamat</label>
                        <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Batal</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{user ? 'Simpan Perubahan' : 'Tambah'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminDashboard;