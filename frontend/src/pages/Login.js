import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import { motion } from 'framer-motion';
import './Login.css';

// Import foto kukang PNG (letakkan di folder public/images/)
import kukangImage from '../assets/images/kukang-login.png'; // atau dari public

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(formData.username, formData.password);
        
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
        
        setLoading(false);
    };

    return (
        <div className="login-container">
            {/* Left side - Foto Kukang PNG */}
            <div className="login-image-section">
                <div className="image-overlay"></div>
                <img 
                    src={kukangImage} 
                    alt="Kukang" 
                    className="kukang-image"
                />                
            </div>

            {/* Right side - Login Form */}
            <div className="login-form-section">
                <motion.div 
                    className="login-form"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="form-header">
                        <h2>Login</h2>
                        <p>Silakan masuk ke akun Anda</p>
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
                            <FiMail className="input-icon" />
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

                        <motion.button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {loading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <FiLogIn /> Login
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="form-footer">
                        <p>
                            Belum punya akun?{' '}
                            <Link to="/register" className="register-link">
                                Daftar disini
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;