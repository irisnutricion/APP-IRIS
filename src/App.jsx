import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PatientList from './components/Patients/PatientList';
import PatientForm from './components/Patients/PatientForm';
import PatientDetail from './components/Patients/PatientDetail';
import Renewals from './components/Renewals/Renewals';

import Settings from './components/Settings/Settings';
import Statistics from './components/Settings/Statistics';
import TrackingCalendar from './components/Tracking/TrackingCalendar';
import Tasks from './components/Tasks/Tasks';
import Payments from './components/Payments/Payments';
import Team from './components/Team/Team';

function App() {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<PatientList />} />
            <Route path="patients/new" element={<PatientForm />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="patients/:id/edit" element={<PatientForm />} />
            <Route path="tracking" element={<TrackingCalendar />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="renewals" element={<Renewals />} />
            <Route path="payments" element={<Payments />} />
            <Route path="team" element={<Team />} />

            <Route path="statistics" element={<Statistics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </DataProvider>
  );
}

export default App;
