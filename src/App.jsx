import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DemoBanner from './components/DemoBanner';
import TrainingLayout from './pages/training/TrainingLayout';
import TrainingCourses from './pages/training/TrainingCourses';
import TrainingGroups from './pages/training/TrainingGroups';
import TrainingGroupDetail from './pages/training/TrainingGroupDetail';
import TrainingAttendance from './pages/training/TrainingAttendance';
import TrainingReports from './pages/training/TrainingReports';
import TrainingSettings from './pages/training/TrainingSettings';

function Shell({ children }) {
  return (
    <>
      <DemoBanner />
      <div className="min-h-screen max-w-7xl mx-auto p-4 sm:p-6">{children}</div>
    </>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/" element={<Shell><TrainingLayout /></Shell>}>
          <Route index element={<Navigate to="groups" replace />} />
          <Route path="groups" element={<TrainingGroups />} />
          <Route path="groups/:id" element={<TrainingGroupDetail />} />
          <Route path="courses" element={<TrainingCourses />} />
          <Route path="attendance" element={<TrainingAttendance />} />
          <Route path="reports" element={<TrainingReports />} />
          <Route path="settings" element={<TrainingSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
