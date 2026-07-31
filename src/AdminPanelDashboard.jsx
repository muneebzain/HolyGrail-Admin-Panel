import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Dashboard from './components/Dashboard';
import UserTable from './components/UserTable';
import ProductTable from './components/ProductTable';
import SupportTable from './components/SupportTable';
import OrderTable from './components/OrderTable';
import LoadingState from './components/LoadingState';
import './AdminPanel.css';

const ADMIN_EMAIL = 'adminholygrail@gmail.com';
const ADMIN_TABS = new Set(['dashboard', 'users', 'products', 'support', 'orders']);

const AdminPanelDashboard = () => {
    const [user, setUser] = useState(null);
    const [selectedTab, setSelectedTab] = useState(() => {
        const savedTab = sessionStorage.getItem('adminSelectedTab');
        return ADMIN_TABS.has(savedTab) ? savedTab : 'dashboard';
    });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser?.email === ADMIN_EMAIL) {
                setUser(currentUser);
            } else {
                setUser(null);
            }
            setCheckingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            if (result.user.email !== ADMIN_EMAIL) {
                setError('Unauthorized admin email.');
                signOut(auth); // Force logout if not admin
            } else {
                setUser(result.user);
                setError('');
            }
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    const handleLogout = () => {
        signOut(auth);
    };

    const selectTab = (tab) => {
        sessionStorage.setItem('adminSelectedTab', tab);
        setSelectedTab(tab);
    };

    const renderSelectedTab = () => {
        switch (selectedTab) {
            case 'dashboard': return <Dashboard />;
            case 'users': return <UserTable />;
            case 'products': return <ProductTable />;
            case 'support': return <SupportTable />;
            case 'orders': return <OrderTable />;
            default: return <Dashboard />;
        }
    };

    if (checkingAuth) {
        return <LoadingState message="Loading admin panel..." detail="Checking your secure session." fullPage />;
    }

    if (!user) {
        return (
            <div className="login-container">
                <h2>Admin Login</h2>
                <form onSubmit={handleLogin} className="login-form">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit">Login</button>
                    {error && <p className="error">{error}</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <span className="admin-kicker">Holy Grails</span>
                    <h1>Admin Dashboard</h1>
                </div>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
            <div className="tab-buttons">
                <button onClick={() => selectTab('dashboard')} className={selectedTab === 'dashboard' ? 'active' : ''}>Dashboard</button>
                <button onClick={() => selectTab('users')} className={selectedTab === 'users' ? 'active' : ''}>Users</button>
                <button onClick={() => selectTab('products')} className={selectedTab === 'products' ? 'active' : ''}>Products</button>
                <button onClick={() => selectTab('support')} className={selectedTab === 'support' ? 'active' : ''}>Support Tickets</button>
                <button onClick={() => selectTab('orders')} className={selectedTab === 'orders' ? 'active' : ''}>Orders</button>
            </div>
            <div className="tab-content">
                {renderSelectedTab()}
            </div>
        </div>
    );
};

export default AdminPanelDashboard;
