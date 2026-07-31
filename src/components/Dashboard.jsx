import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { FaBox, FaClipboardList, FaGift, FaShoppingCart, FaTicketAlt, FaUsers } from 'react-icons/fa';
import { db } from '../firebase';
import { COLLECTIONS, normalizeProduct } from '../utils/adminModels';
import LoadingState from './LoadingState';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [stats, setStats] = useState({
        users: 0,
        products: 0,
        raffles: 0,
        oneTime: 0,
        orders: 0,
        tickets: 0
    });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersSnap, productsSnap, ordersSnap, ticketsSnap] = await Promise.all([
                    getDocs(collection(db, COLLECTIONS.users)),
                    getDocs(collection(db, COLLECTIONS.products)),
                    getDocs(collection(db, COLLECTIONS.orders)),
                    getDocs(collection(db, COLLECTIONS.support))
                ]);

                const productDocs = productsSnap.docs.map(normalizeProduct);
                const raffles = productDocs.filter((product) => product.kind === 'Raffle').length;
                const oneTime = productDocs.filter((product) => product.kind === 'One Time').length;

                setStats({
                    users: usersSnap.size,
                    products: productsSnap.size,
                    raffles,
                    oneTime,
                    orders: ordersSnap.size,
                    tickets: ticketsSnap.size
                });
            } catch (error) {
                console.error('Error loading dashboard:', error);
                setLoadError('Dashboard information could not be loaded.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statItems = [
        { label: 'Users', value: stats.users, tone: 'blue', icon: <FaUsers /> },
        { label: 'Products', value: stats.products, tone: 'green', icon: <FaBox /> },
        { label: 'Raffles', value: stats.raffles, tone: 'orange', icon: <FaGift /> },
        { label: 'One Time', value: stats.oneTime, tone: 'purple', icon: <FaTicketAlt /> },
        { label: 'Orders', value: stats.orders, tone: 'teal', icon: <FaShoppingCart /> },
        { label: 'Tickets', value: stats.tickets, tone: 'red', icon: <FaClipboardList /> }
    ];

    return (
        <div className="dashboard-container">
            <div className="section-header">
                <div>
                    <h2>Dashboard Overview</h2>
                    <p>Current admin snapshot</p>
                </div>
            </div>
            {loading ? (
                <LoadingState message="Loading dashboard..." detail="Calculating the latest admin totals." />
            ) : loadError ? (
                <div className="page-error-state">{loadError}</div>
            ) : (
                <div className="stats-grid">
                    {statItems.map((item) => (
                        <div className={`stat-card ${item.tone}`} key={item.label}>
                            <div className="stat-icon">{item.icon}</div>
                            <div className="stat-info">
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
