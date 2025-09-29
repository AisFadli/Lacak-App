import React, { useState, useEffect } from 'react';
import { Delivery, Driver } from '../types';
import { getDeliveryForCustomer, subscribeToDriverLocation } from '../services/supabase';
import MapWrapper from '../components/MapWrapper';
import { useToast } from '../contexts/ToastContext';
import { ToastType } from '../components/Toast';

interface CustomerDashboardProps {
  customerId: string;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ customerId }) => {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchDelivery = async () => {
      if (!customerId) return;
      setLoading(true);
      try {
        const data = await getDeliveryForCustomer(customerId);
        setDelivery(data);
        if (data?.driver) {
          setDriver(data.driver);
        }
      } catch (error) {
        console.error(error);
        addToast('Gagal memuat detail pengiriman.', ToastType.ERROR);
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
  }, [customerId, addToast]);

  useEffect(() => {
    if (!driver?.id) return;

    const subscription = subscribeToDriverLocation(driver.id, (payload) => {
      const updatedDriver = payload.new as Driver;
      setDriver(updatedDriver);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [driver?.id]);

  if (loading) {
    return <p className="text-center">Memuat detail pengiriman Anda...</p>;
  }

  if (!delivery) {
    return <p className="text-center">Tidak dapat menemukan data pengiriman untuk Anda.</p>;
  }

  const mapMarkers = driver && driver.current_lat && driver.current_lng ? [{
    id: driver.id,
    lng: driver.current_lng,
    lat: driver.current_lat,
    color: '#10B981',
    popupContent: `<strong class="text-sm">${driver.name}</strong><br>Driver Anda`
  }] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Detail Pengiriman</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-semibold text-lg text-blue-600 dark:text-blue-400">{delivery.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Driver</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{driver?.name || 'Menunggu driver'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dari</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{delivery.origin_address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tujuan</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{delivery.destination_address}</p>
          </div>
        </div>
      </div>
      <div className="lg:col-span-2 h-96 lg:h-auto min-h-[500px] w-full bg-gray-200 dark:bg-gray-800 rounded-xl shadow-lg">
        <MapWrapper markers={mapMarkers} />
      </div>
    </div>
  );
};

export default CustomerDashboard;