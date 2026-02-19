import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const EvolutionChart = ({ measurements, dataKey, label, color, chartRef }) => {
    // Sort measurements by date
    const sortedData = [...measurements].sort((a, b) => new Date(a.date) - new Date(b.date));

    const data = {
        labels: sortedData.map(m => new Date(m.date).toLocaleDateString()),
        datasets: [
            {
                label: label,
                data: sortedData.map(m => m[dataKey]),
                borderColor: color,
                backgroundColor: color,
                tension: 0.3,
                spanGaps: true, // Conecta los puntos aunque haya datos faltantes
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: false,
            },
            x: {
                ticks: {
                    maxTicksLimit: 5,
                    maxRotation: 0,
                    autoSkip: true
                }
            }
        }
    };

    return <Line ref={chartRef} options={options} data={data} />;
};

export default EvolutionChart;
