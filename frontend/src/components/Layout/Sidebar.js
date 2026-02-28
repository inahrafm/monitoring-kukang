import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    FiHome, 
    FiBarChart2, 
    FiSettings
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen }) => {
    const menuItems = [
        { path: '/dashboard', name: 'Dashboard', icon: <FiHome /> },
        { path: '/history', name: 'History', icon: <FiBarChart2 /> },
        { path: '/settings', name: 'Pengaturan', icon: <FiSettings /> }
    ];

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-menu">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => 
                            `sidebar-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        {isOpen && <span className="sidebar-text">{item.name}</span>}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;