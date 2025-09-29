import React, { useState, useEffect, useRef } from 'react';
import { Delivery, DeliveryStatus } from '../types';
import { getDeliveriesForDriver, updateDriverLocation, updateDeliveryStatus } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { ToastType } from '../components/Toast';

interface DriverDashboardProps {
  driverId: string;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ driverId }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const locationInterval = useRef<number | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoading(true);
      try {
        const data = await getDeliveriesForDriver(driverId);
        setDeliveries(data);
        const inProgressDelivery = data.find(d => d.status === DeliveryStatus.IN_PROGRESS);
        if (inProgressDelivery) {
            setActiveDeliveryId(inProgressDelivery.id);
        }
      } catch (error) {
        console.error(error);
        addToast('Gagal memuat tugas pengiriman.', ToastType.ERROR);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();

    return () => {
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
      }
    };
  }, [driverId, addToast]);

  const simulateLocationUpdate = async (lat: number, lng: number) => {
    const newLat = lat + (Math.random() - 0.5) * 0.005;
    const newLng = lng + (Math.random() - 0.5) * 0.005;
    try {
        await updateDriverLocation(driverId, newLat, newLng);
    } catch (error) {
        console.error('Failed to update driver location in background:', error);
    }
  };
  
  const handleStartTrip = async (delivery: Delivery) => {
    setIsUpdating(true);
    setActiveDeliveryId(delivery.id);
    
    try {
      await updateDeliveryStatus(delivery.id, DeliveryStatus.IN_PROGRESS);
      setDeliveries(d => d.map(deli => deli.id === delivery.id ? {...deli, status: DeliveryStatus.IN_PROGRESS} : deli));
      addToast('Perjalanan dimulai!', ToastType.SUCCESS);
      
      let currentLat = -6.2088;
      let currentLng = 106.8456;

      await simulateLocationUpdate(currentLat, currentLng);

      locationInterval.current = window.setInterval(() => {
        simulateLocationUpdate(currentLat, currentLng);
        currentLat += (Math.random() - 0.5) * 0.005;
        currentLng += (Math.random() - 0.5) * 0.005;
      }, 5000);
    } catch (error) {
      console.error(error);
      addToast('Gagal memulai perjalanan.', ToastType.ERROR);
      setActiveDeliveryId(null);
      setDeliveries(d => d.map(deli => deli.id === delivery.id ? {...deli, status: DeliveryStatus.PENDING} : deli));
    } finally {
        setIsUpdating(false);
    }
  };

  const handleEndTrip = async (delivery: Delivery) => {
    setIsUpdating(true);
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
    const originalStatus = delivery.status;
    
    setDeliveries(d => d.map(deli => deli.id === delivery.id ? {...deli, status: DeliveryStatus.DELIVERED} : deli));
    setActiveDeliveryId(null);
    
    try {
      await updateDeliveryStatus(delivery.id, DeliveryStatus.DELIVERED);
      addToast('Perjalanan berhasil diselesaikan.', ToastType.SUCCESS);
    } catch (error) {
      console.error(error);
      addToast('Gagal menyelesaikan perjalanan.', ToastType.ERROR);
      setDeliveries(d => d.map(deli => deli.id === delivery.id ? {...deli, status: originalStatus} : deli));
      setActiveDeliveryId(delivery.id);
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tugas Pengiriman Anda</h2>
      {loading ? (
        <p>Memuat tugas...</p>
      ) : deliveries.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center">
            <p className="text-gray-600 dark:text-gray-300">Tidak ada tugas pengiriman saat ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map(delivery => (
            <div key={delivery.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">ID: {delivery.id.substring(0, 8)}</p>
                <p className="font-semibold text-gray-800 dark:text-white">Pelanggan: {delivery.customer_name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Dari: {delivery.origin_address}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ke: {delivery.destination_address}</p>
                 <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">Status: {delivery.status}</p>
              </div>
              <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">
                {delivery.status === DeliveryStatus.PENDING && (
                   <button
                    onClick={() => handleStartTrip(delivery)}
                    disabled={!!activeDeliveryId || isUpdating}
                    className="w-full md:w-auto px-6 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-300"
                  >
                    {isUpdating && activeDeliveryId === delivery.id ? 'Memulai...' : 'Mulai Perjalanan'}
                  </button>
                )}
                 {delivery.status === DeliveryStatus.IN_PROGRESS && (
                   <button
                    onClick={() => handleEndTrip(delivery)}
                    disabled={isUpdating}
                    className="w-full md:w-auto px-6 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-300"
                  >
                    {isUpdating && activeDeliveryId === delivery.id ? 'Menyelesaikan...' : 'Selesaikan Perjalanan'}
                  </button>
                )}
                 {delivery.status === DeliveryStatus.DELIVERED && (
                   <p className="px-6 py-2 text-green-700 dark:text-green-400 font-semibold">Selesai</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
