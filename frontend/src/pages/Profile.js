import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiSave } from 'react-icons/fi';
import { motion } from 'framer-motion';
import './Profile.css';

const Profile = () => {
    const { user, updateProfile, changePassword } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [profileData, setProfileData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || ''
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const result = await updateProfile(profileData);
        
        if (result.success) {
            setMessage({ type: 'success', text: 'Profil berhasil diperbarui' });
        } else {
            setMessage({ type: 'error', text: result.message });
        }
        
        setLoading(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage({ type: 'error', text: 'Password baru tidak cocok' });
            setLoading(false);
            return;
        }

        if (passwordData.new_password.length < 6) {
            setMessage({ type: 'error', text: 'Password minimal 6 karakter' });
            setLoading(false);
            return;
        }

        const result = await changePassword({
            current_password: passwordData.current_password,
            new_password: passwordData.new_password
        });
        
        if (result.success) {
            setMessage({ type: 'success', text: 'Password berhasil diubah' });
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
        } else {
            setMessage({ type: 'error', text: result.message });
        }
        
        setLoading(false);
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>Edit Profil</h1>
                <p>Kelola informasi akun Anda</p>
            </div>

            <div className="profile-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <FiUser /> Informasi Profil
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
                    onClick={() => setActiveTab('password')}
                >
                    <FiLock /> Ubah Password
                </button>
            </div>

            {message.text && (
                <motion.div 
                    className={`message ${message.type}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {message.text}
                </motion.div>
            )}

            <div className="profile-content">
                {activeTab === 'profile' && (
                    <motion.form 
                        className="profile-form"
                        onSubmit={handleProfileUpdate}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="form-group">
                            <label>Username</label>
                            <div className="input-group">
                                <FiUser className="input-icon" />
                                <input 
                                    type="text" 
                                    value={user?.username || ''}
                                    disabled
                                    className="disabled-input"
                                />
                            </div>
                            <small>Username tidak dapat diubah</small>
                        </div>

                        <div className="form-group">
                            <label>Nama Lengkap</label>
                            <div className="input-group">
                                <FiUser className="input-icon" />
                                <input 
                                    type="text" 
                                    value={profileData.full_name}
                                    onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                                    placeholder="Masukkan nama lengkap"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <div className="input-group">
                                <FiMail className="input-icon" />
                                <input 
                                    type="email" 
                                    value={profileData.email}
                                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                    placeholder="Masukkan email"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="save-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <FiSave /> Simpan Perubahan
                                </>
                            )}
                        </button>
                    </motion.form>
                )}

                {activeTab === 'password' && (
                    <motion.form 
                        className="profile-form"
                        onSubmit={handlePasswordChange}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="form-group">
                            <label>Password Saat Ini</label>
                            <div className="input-group">
                                <FiLock className="input-icon" />
                                <input 
                                    type="password" 
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                    placeholder="Masukkan password saat ini"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Password Baru</label>
                            <div className="input-group">
                                <FiLock className="input-icon" />
                                <input 
                                    type="password" 
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                                    placeholder="Masukkan password baru"
                                    required
                                />
                            </div>
                            <small>Minimal 6 karakter</small>
                        </div>

                        <div className="form-group">
                            <label>Konfirmasi Password Baru</label>
                            <div className="input-group">
                                <FiLock className="input-icon" />
                                <input 
                                    type="password" 
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                                    placeholder="Konfirmasi password baru"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="save-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <FiSave /> Ubah Password
                                </>
                            )}
                        </button>
                    </motion.form>
                )}
            </div>

            <div className="profile-info">
                <h3>Informasi Akun</h3>
                <div className="info-item">
                    <span>Terdaftar sejak:</span>
                    <strong>{new Date(user?.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</strong>
                </div>
                <div className="info-item">
                    <span>Terakhir login:</span>
                    <strong>{user?.last_login ? new Date(user.last_login).toLocaleString('id-ID') : 'Belum pernah'}</strong>
                </div>
                <div className="info-item">
                    <span>Role:</span>
                    <strong className="role-badge">{user?.role}</strong>
                </div>
            </div>
        </div>
    );
};

export default Profile;