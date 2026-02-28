import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiUserPlus } from 'react-icons/fi';
import { motion } from 'framer-motion';
import './Register.css';

// Import foto kukang PNG
import kukangImage from '../assets/images/kukang-login.png'; // atau dari public

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const { register } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Password tidak cocok');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password minimal 6 karakter');
            return;
        }

        setLoading(true);

        const result = await register({
            username: formData.username,
            email: formData.email,
            full_name: formData.full_name,
            password: formData.password
        });
        
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
        
        setLoading(false);
    };

    return (
        <div className="register-container">
            {/* Left side - Foto Kukang PNG */}
            <div className="register-image-section">
                <div className="image-overlay"></div>
                <img 
                    src={kukangImage} 
                    alt="Kukang" 
                    className="kukang-image"
                />                
            </div>

            {/* Right side - Register Form */}
            <div className="register-form-section">
                <motion.div 
                    className="register-form"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="form-header">
                        <h2>Daftar Akun</h2>
                        <p>Isi data diri Anda untuk mendaftar</p>
                    </div>

                    {error && (
                        <motion.div 
                            className="error-message"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <FiUser className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                placeholder="Username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="input-group">
                            <FiMail className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="input-group">
                            <FiUser className="input-icon" />
                            <input
                                type="text"
                                name="full_name"
                                placeholder="Nama Lengkap"
                                value={formData.full_name}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="input-group">
                            <FiLock className="input-icon" />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="input-group">
                            <FiLock className="input-icon" />
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Konfirmasi Password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>

                        <motion.button
                            type="submit"
                            className="register-btn"
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {loading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <FiUserPlus /> Daftar
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="form-footer">
                        <p>
                            Sudah punya akun?{' '}
                            <Link to="/login" className="login-link">
                                Login disini
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Register;