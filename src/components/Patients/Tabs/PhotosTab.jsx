import { Image as ImageIcon } from 'lucide-react';
import { safeFormat } from '../../../utils/dateUtils';

const PhotosTab = ({ patient }) => {
    const photos = patient.measurements?.filter(m => m.photo).sort((a, b) => new Date(b.date) - new Date(a.date)) || [];

    if (photos.length === 0) return (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
            <ImageIcon className="text-gray-300 mb-4 mx-auto" size={48} />
            <p className="text-gray-500 font-medium">No hay fotos de progreso.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map(p => (
                <div key={p.id} className="card p-3 group relative cursor-pointer hover:-translate-y-1 transition-transform">
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-gray-100 mb-3">
                        <img src={p.photo} alt={`Progreso ${p.date}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center">
                        <div className="text-sm font-bold text-gray-800">{safeFormat(p.date)}</div>
                        <div className="text-xs text-muted">{p.weight} kg</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PhotosTab;
