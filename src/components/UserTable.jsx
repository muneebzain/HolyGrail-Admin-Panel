import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { COLLECTIONS, formatCurrency, formatDate, normalizeUser } from '../utils/adminModels';

const UserTable = () => {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, COLLECTIONS.users), (snapshot) => {
            const userList = snapshot.docs.map(normalizeUser);
            setUsers(userList);
        });

        return () => unsubscribe();
    }, []);

    const filtered = users.filter((user) => {
        const searchText = `${user.displayName} ${user.email} ${user.phone} ${user.address}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
    });

    return (
        <div className="panel-section">
            <div className="section-header">
                <div>
                    <h2>Users</h2>
                    <p>{filtered.length} of {users.length} users</p>
                </div>
            </div>

            <div className="filters-bar">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="table-shell">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Phone</th>
                            <th>Shipping Address</th>
                            <th>Wallet</th>
                            <th>Seller</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="7" className="no-data">No users found</td></tr>
                        ) : (
                            filtered.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <strong>{user.displayName}</strong>
                                        <span className="muted-line">{user.email || 'N/A'}</span>
                                    </td>
                                    <td>{user.phone || 'N/A'}</td>
                                    <td>{user.address}</td>
                                    <td>{formatCurrency(user.grailWallet)}</td>
                                    <td>{user.sellerStatus || 'N/A'}</td>
                                    <td>{formatDate(user.joinedAt)}</td>
                                    <td>
                                        <Link to={`/user/${user.id}`} target="_blank" className="view-btn">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserTable;
