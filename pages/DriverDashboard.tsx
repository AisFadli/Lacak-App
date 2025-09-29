import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Delivery, DeliveryStatus } from '../types';
import { getDeliveriesForDriver, updateDriverLocation, updateDeliveryStatus, geocodeAddress, getDirections } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { ToastType } from '../components/Toast';
import MapWrapper from '../components/MapWrapper';

interface DriverDashboardProps {
  driverId: string;
}

interface Position {
    lat: number;
    lng: number;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ driverId }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('Nonaktif');
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [routeGeoJson, setRouteGeoJson] = useState<any | null>(null);
  
  const watchId = useRef<number | null>(null);
  const { addToast } = useToast();

  const activeDelivery = useMemo(() => deliveries.find(d => d.status === DeliveryStatus.IN_PROGRESS), [deliveries]);
  const pendingDeliveries = useMemo(() => deliveries.filter(d => d.status === DeliveryStatus.PENDING), [deliveries]);


  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoading(true);
      try {
        const data = await getDeliveriesForDriver(driverId);
        setDeliveries(data);
      } catch (error) {
        console.error(error);
        addToast('Gagal memuat tugas pengiriman.', ToastType.ERROR);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [driverId, addToast]);
  
  const handleActivateGps = () => {
    if (isGpsActive) return;

    if (!navigator.geolocation) {
        addToast('Geolocation tidak didukung oleh browser Anda.', ToastType.ERROR);
        return;
    }

    setGpsStatus('Mencari lokasi...');
    watchId.current = navigator.geolocation.watchPosition(
        (position) => {
            const newPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            setCurrentPosition(newPos);
            setIsGpsActive(true);
            setGpsStatus('Aktif');
            updateDriverLocation(driverId, newPos.lat, newPos.lng).catch(err => {
                console.error("Gagal update lokasi driver di background:", err);
            });
        },
        (error) => {
            console.error(error);
            addToast('Tidak bisa mendapatkan lokasi GPS.', ToastType.ERROR);
            setGpsStatus('Gagal');
            setIsGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  
  const handleStartTrip = async (delivery: Delivery) => {
    if (!currentPosition) {
        addToast('Mohon aktifkan GPS terlebih dahulu.', ToastType.ERROR);
        return;
    }

    setIsUpdating(true);
    
    try {
        addToast('Menyiapkan rute perjalanan...', ToastType.INFO);

        const [originCoords, destinationCoords] = await Promise.all([
            geocodeAddress(delivery.origin_address),
            geocodeAddress(delivery.destination_address),
        ]);

        const startCoords: [number, number] = [currentPosition.lng, currentPosition.lat];
        
        const directions = await getDirections(startCoords, originCoords, destinationCoords);
        setRouteGeoJson(directions);

        await updateDeliveryStatus(delivery.id, DeliveryStatus.IN_PROGRESS);
        setDeliveries(d => d.map(deli => deli.id === delivery.id ? {...deli, status: DeliveryStatus.IN_PROGRESS} : deli));
        addToast('Perjalanan dimulai!', ToastType.SUCCESS);

    } catch (error) {
      console.error(error);
      addToast('Gagal memulai perjalanan. Periksa alamat atau koneksi.', ToastType.ERROR);
      setDeliveries(d => d.map(deli => deli.id === delivery.id ? {...deli, status: DeliveryStatus.PENDING} : deli));
    } finally {
        setIsUpdating(false);
    }
  };

  const handleEndTrip = async (delivery: Delivery) => {
    if (!currentPosition) {
        addToast('Lokasi terakhir tidak ditemukan.', ToastType.ERROR);
        return;
    }
    
    setIsUpdating(true);
    
    // Stop GPS tracking
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsGpsActive(false);
    setGpsStatus('Nonaktif');
    
    const originalStatus = delivery.status;
    
    setDeliveries(d => d.map(deli => deli.id === delivery.id ? {...deli, status: DeliveryStatus.DELIVERED} : deli));
    setRouteGeoJson(null);
    
    try {
      await updateDeliveryStatus(delivery.id, DeliveryStatus.DELIVERED, { lat: currentPosition.lat, lng: currentPosition.lng });
      addToast('Perjalanan berhasil diselesaikan.', ToastType.SUCCESS);
    } catch (error) {
      console.error(error);
      addToast('Gagal menyelesaikan perjalanan.', ToastType.ERROR);
      setDeliveries(d => d.map(deli => deli.id === delivery.id ? {...deli, status: originalStatus} : deli));
      // Re-activate GPS if failed
      handleActivateGps();
    } finally {
      setIsUpdating(false);
    }
  };

  const mapMarkers = currentPosition ? [{
      id: 'driver',
      lng: currentPosition.lng,
      lat: currentPosition.lat,
      color: '#10B981',
      popupContent: `<strong>Anda di sini</strong>`
  }] : [];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dasbor Driver</h2>
        <div className="flex items-center space-x-4">
             <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                isGpsActive ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
             }`}>
                GPS: {gpsStatus}
             </span>
             <button
                onClick={handleActivateGps}
                disabled={isGpsActive}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-300"
              >
                Aktifkan GPS
              </button>
        </div>
      </div>
      
      {loading ? <p>Memuat tugas...</p> : 
      
      activeDelivery ? (
        <div key={activeDelivery.id} className="space-y-4">
            <h3 className="text-lg font-bold">Pengiriman Sedang Berlangsung</h3>
            <div className="h-96 w-full rounded-xl shadow-lg overflow-hidden">
                <MapWrapper markers={mapMarkers} routeGeoJson={routeGeoJson} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center">
                 <div>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">ID: {activeDelivery.id.substring(0, 8)}</p>
                    <p className="font-semibold text-gray-800 dark:text-white">Pelanggan: {activeDelivery.customer_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Dari: {activeDelivery.origin_address}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ke: {activeDelivery.destination_address}</p>
                 </div>
                 <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">
                    <button
                        onClick={() => handleEndTrip(activeDelivery)}
                        disabled={isUpdating}
                        className="w-full md:w-auto px-6 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-300"
                    >
                        {isUpdating ? 'Menyelesaikan...' : 'Selesaikan Perjalanan'}
                    </button>
                 </div>
            </div>
        </div>
      ) : pendingDeliveries.length > 0 ? (
        <div className="space-y-4">
            <h3 className="text-lg font-bold">Tugas Tersedia</h3>
             {pendingDeliveries.map(delivery => (
                <div key={delivery.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <p className="font-semibold text-gray-800 dark:text-white">Pelanggan: {delivery.customer_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Dari: {delivery.origin_address}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ke: {delivery.destination_address}</p>
                </div>
                <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">
                    <button
                        onClick={() => handleStartTrip(delivery)}
                        disabled={!isGpsActive || isUpdating}
                        className="w-full md:w-auto px-6 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-300"
                    >
                        {isUpdating ? 'Memproses...' : 'Mulai Perjalanan'}
                    </button>
                </div>
                </div>
            ))}
        </div>
      ) : (
         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center">
            <p className="text-gray-600 dark:text-gray-300">Tidak ada tugas pengiriman baru saat ini.</p>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;