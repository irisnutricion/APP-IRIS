import { useData } from '../../context/DataContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import { Users, MapPin, Target, Share2 } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Statistics = () => {
    const { patients } = useData();

    // --- Data Processing ---

    // 1. Age Distribution
    const ageData = {
        '18-25': 0,
        '26-35': 0,
        '36-45': 0,
        '46-55': 0,
        '56+': 0
    };

    patients.forEach(p => {
        const age = parseInt(p.age);
        if (age >= 18 && age <= 25) ageData['18-25']++;
        else if (age >= 26 && age <= 35) ageData['26-35']++;
        else if (age >= 36 && age <= 45) ageData['36-45']++;
        else if (age >= 46 && age <= 55) ageData['46-55']++;
        else if (age >= 56) ageData['56+']++;
    });

    const ageChartData = {
        labels: Object.keys(ageData),
        datasets: [{
            label: 'Clientes',
            data: Object.values(ageData),
            backgroundColor: '#28483a', // Primary
            borderRadius: 4,
        }]
    };

    // 2. Sex Distribution
    const sexData = {
        'Mujer': 0,
        'Hombre': 0,
        'Otro': 0
    };

    patients.forEach(p => {
        const sex = p.sex?.toLowerCase();
        if (sex === 'mujer') sexData['Mujer']++;
        else if (sex === 'hombre') sexData['Hombre']++;
        else sexData['Otro']++;
    });

    const sexChartData = {
        labels: Object.keys(sexData),
        datasets: [{
            data: Object.values(sexData),
            backgroundColor: ['#d09a84', '#28483a', '#e5e7eb'], // Secondary, Primary, Gray
            borderWidth: 0,
        }]
    };

    // 3. City Distribution (Top 5)
    const cityCount = {};
    patients.forEach(p => {
        const city = p.city?.trim() || 'No especificado';
        cityCount[city] = (cityCount[city] || 0) + 1;
    });

    // Sort and get top 5
    const sortedCities = Object.entries(cityCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const cityChartData = {
        labels: sortedCities.map(([city]) => city),
        datasets: [{
            label: 'Clientes',
            data: sortedCities.map(([, count]) => count),
            backgroundColor: '#d09a84', // Secondary
            borderRadius: 4,
        }]
    };

    // 4. Referral Source
    const referralCount = {};
    patients.forEach(p => {
        const source = p.referral_source || p.referralSource || 'No especificado';
        // Capitalize first letter
        const label = source.charAt(0).toUpperCase() + source.slice(1);
        referralCount[label] = (referralCount[label] || 0) + 1;
    });

    const referralChartData = {
        labels: Object.keys(referralCount),
        datasets: [{
            data: Object.values(referralCount),
            backgroundColor: [
                '#28483a', // Primary
                '#d09a84', // Secondary
                '#a8b3cf', // Slate-ish
                '#e5e7eb', // Gray
                '#fcd34d'  // Yellow
            ],
            borderWidth: 0,
        }]
    };

    const cardClass = "bg-white p-6 rounded-xl border border-slate-100 shadow-sm";
    const headerClass = "flex items-center gap-2 font-bold text-slate-700 mb-6";

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Estadísticas de Clientes</h1>
                    <p className="page-subtitle">Análisis demográfico y de captación</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">

                {/* Age Chart */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <Users size={20} className="text-primary-600" /> Distribución por Edad
                    </div>
                    <div className="h-64 flex justify-center">
                        <Bar
                            data={ageChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                            }}
                        />
                    </div>
                </div>

                {/* Sex Chart */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <Users size={20} className="text-secondary-600" /> Distribución por Sexo
                    </div>
                    <div className="h-64 flex justify-center relative">
                        <div className="w-64 h-64">
                            <Doughnut
                                data={sexChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'right' } }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* City Chart */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <MapPin size={20} className="text-primary-600" /> Top Ciudades
                    </div>
                    <div className="h-64 flex justify-center">
                        <Bar
                            data={cityChartData}
                            options={{
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
                            }}
                        />
                    </div>
                </div>

                {/* Referral Chart */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <Share2 size={20} className="text-secondary-600" /> Canal de Captación
                    </div>
                    <div className="h-64 flex justify-center">
                        <div className="w-64 h-64">
                            <Pie
                                data={referralChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'right' } }
                                }}
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Statistics;
