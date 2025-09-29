import React, { useState, useEffect, useCallback } from 'react';
import { Delivery, Driver } from '../types';
import { getDeliveryForCustomer, subscribeToDriverLocation, subscribeToCustomerDelivery } from '../services/supabase';
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

  const fetchDelivery = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await getDeliveryForCustomer(customerId);
      setDelivery(data);
      if (data?.driver) {
        setDriver(data.driver);
      } else {
        setDriver(null);
      }
    } catch (error) {
      console.error(error);
      addToast('Gagal memuat detail pengiriman.', ToastType.ERROR);
    } finally {
      setLoading(false);
    }
  }, [customerId, addToast]);

  useEffect(() => {
    fetchDelivery();

    const deliverySubscription = subscribeToCustomerDelivery(customerId, (payload) => {
        addToast('Status pengiriman diperbarui.', ToastType.INFO);
        fetchDelivery();
    });

    return () => {
      deliverySubscription.unsubscribe();
    };
  }, [customerId, fetchDelivery, addToast]);

  useEffect(() => {
    if (!driver?.id || delivery?.status !== 'IN_PROGRESS') {
      return; // No subscription needed if no driver or delivery is not active
    }

    const subscription = subscribeToDriverLocation(driver.id, (payload) => {
      const updatedDriver = payload.new as Driver;
      setDriver(updatedDriver);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [driver?.id, delivery?.status]);

  if (loading && !delivery) {
    return <p className="text-center">Memuat detail pengiriman Anda...</p>;
  }

  if (!delivery) {
    return (
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Tidak Ada Pengiriman Aktif</h3>
            <p className="text-gray-600 dark:text-gray-400">Tidak dapat menemukan data pengiriman untuk Anda. Jika Anda baru saja memesan, silakan tunggu sebentar.</p>
        </div>
    );
  }
  
  const isTrackingActive = delivery.status === 'IN_PROGRESS' && driver?.current_lat && driver?.current_lng;
  const mapMarkers = [];

  if (isTrackingActive) {
    mapMarkers.push({
      id: driver!.id,
      lng: driver!.current_lng!,
      lat: driver!.current_lat!,
      color: '#10B981',
      popupContent: `<strong class="text-sm">${driver!.name}</strong><br>Driver Anda`
    });
  }
  
  if (delivery.status === 'DELIVERED' && delivery.final_lat && delivery.final_lng) {
      mapMarkers.push({
          id: 'destination-delivered',
          lng: delivery.final_lng,
          lat: delivery.final_lat,
          color: '#3B82F6',
          popupContent: `<strong class="text-sm">Tujuan Akhir</strong><br>Paket telah sampai`
      });
  }


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
           {delivery.status === 'DELIVERED' && (
             <div className="pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-green-600 dark:text-green-400 font-semibold">Paket telah berhasil diantar!</p>
            </div>
          )}
        </div>
      </div>
      <div className="lg:col-span-2 h-96 lg:h-auto min-h-[500px] w-full bg-gray-200 dark:bg-gray-800 rounded-xl shadow-lg">
        <MapWrapper markers={mapMarkers} />
      </div>
    </div>
  );
};

export default CustomerDashboard;