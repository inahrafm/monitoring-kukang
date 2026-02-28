import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KandangProvider } from './context/KandangContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './components/Dashboard/Dashboard';
import HistoryView from './components/History/HistoryView';
import Profile from './pages/Profile';
import './App.css';

const AuthenticatedLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const { user } = useAuth();

    return (
        <div className="app-layout">
            <Navbar 
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
                sidebarOpen={sidebarOpen}
                user={user}
            />
            <div className="main-layout">
                <Sidebar isOpen={sidebarOpen} />
                <div className={`content-wrapper ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const DashboardPage = () => (
    <AuthenticatedLayout>
        <Dashboard />
    </AuthenticatedLayout>
);

const HistoryPage = () => (
    <AuthenticatedLayout>
        <HistoryView />
    </AuthenticatedLayout>
);

const ProfilePage = () => (
    <AuthenticatedLayout>
        <Profile />
    </AuthenticatedLayout>
);

const SettingsPage = () => (
    <AuthenticatedLayout>
        <div className="coming-soon">
            <h2>Pengaturan</h2>
            <p>Halaman sedang dalam pengembangan</p>
        </div>
    </AuthenticatedLayout>
);

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
            
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <DashboardPage />
                </ProtectedRoute>
            } />
            <Route path="/history" element={
                <ProtectedRoute>
                    <HistoryPage />
                </ProtectedRoute>
            } />
            <Route path="/profile" element={
                <ProtectedRoute>
                    <ProfilePage />
                </ProtectedRoute>
            } />
            <Route path="/settings" element={
                <ProtectedRoute>
                    <SettingsPage />
                </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <KandangProvider>
                    <AppRoutes />
                </KandangProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;