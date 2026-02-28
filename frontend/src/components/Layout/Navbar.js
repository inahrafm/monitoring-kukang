import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    FiMenu, 
    FiX, 
    FiBell, 
    FiUser, 
    FiLogOut,
    FiSettings,
    FiChevronDown
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './Navbar.css';

const Navbar = ({ toggleSidebar, sidebarOpen, user }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    
    const userMenuRef = useRef(null);
    const notifRef = useRef(null);

    // Contoh data notifikasi
    const notifications = [
        { id: 1, message: 'Suhu melebihi batas normal (32°C)', time: '2 menit lalu', read: false, type: 'danger' },
        { id: 2, message: 'Kelembaban rendah (45%)', time: '15 menit lalu', read: false, type: 'warning' },
        { id: 3, message: 'Kebisingan terdeteksi (75dB)', time: '1 jam lalu', read: true, type: 'info' },
        { id: 4, message: 'Sensor light offline', time: '2 jam lalu', read: true, type: 'error' }
    ];

    const unreadCount = notifications.filter(n => !n.read).length;

    // Klik di luar untuk menutup dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getNotificationIcon = (type) => {
        switch(type) {
            case 'danger': return '🔴';
            case 'warning': return '🟡';
            case 'info': return '🔵';
            case 'error': return '⚫';
            default: return '⚪';
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-left">
                <button className="navbar-toggle" onClick={toggleSidebar}>
                    {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                </button>
                <div className="navbar-brand">
                    <span className="brand-icon">🦥</span>
                    <span className="brand-text">Kukang Monitoring System</span>
                </div>
            </div>

            <div className="navbar-right">
                {/* Notifications */}
                <div className="navbar-item" ref={notifRef}>
                    <button 
                        className="icon-button" 
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <FiBell size={22} />
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount}</span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div 
                                className="notifications-dropdown"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="dropdown-header">
                                    <h4>Notifikasi</h4>
                                    <span className="unread-count">{unreadCount} baru</span>
                                </div>
                                <div className="notifications-list">
                                    {notifications.map(notif => (
                                        <div 
                                            key={notif.id} 
                                            className={`notification-item ${!notif.read ? 'unread' : ''}`}
                                        >
                                            <div className="notification-icon">
                                                {getNotificationIcon(notif.type)}
                                            </div>
                                            <div className="notification-content">
                                                <p>{notif.message}</p>
                                                <small>{notif.time}</small>
                                            </div>
                                            {!notif.read && <span className="new-dot"></span>}
                                        </div>
                                    ))}
                                </div>
                                <div className="dropdown-footer">
                                    <button className="text-button">Tandai semua telah dibaca</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* User Menu */}
                <div className="navbar-item" ref={userMenuRef}>
                    <button 
                        className="user-button" 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className="user-avatar">
                            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </div>
                        <span className="user-name">{user?.full_name || user?.username}</span>
                        <FiChevronDown className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div 
                                className="user-dropdown"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="dropdown-user-info">
                                    <div className="dropdown-avatar">
                                        {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                    </div>
                                    <div className="dropdown-user-details">
                                        <span className="dropdown-fullname">{user?.full_name || user?.username}</span>
                                        <span className="dropdown-email">{user?.email || 'No email'}</span>
                                    </div>
                                </div>
                                <div className="dropdown-divider"></div>
                                <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }}>
                                    <FiUser size={18} /> Edit Profil
                                </button>
                                <button onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                                    <FiSettings size={18} /> Pengaturan
                                </button>
                                <div className="dropdown-divider"></div>
                                <button onClick={handleLogout} className="logout-btn">
                                    <FiLogOut size={18} /> Logout
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;