import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import DetailModal from './DetailModal';
import { TableLoadingRow } from './LoadingState';
import { COLLECTIONS, formatDateTime, normalizeSupportTicket } from '../utils/adminModels';

const SupportTable = () => {
    const [tickets, setTickets] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, COLLECTIONS.support), (snapshot) => {
            const ticketList = snapshot.docs.map(normalizeSupportTicket);
            const sorted = ticketList.sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setTickets(sorted);
            setLoadError('');
            setLoading(false);
        }, (error) => {
            console.error('Error loading support tickets:', error);
            setLoadError('Support tickets could not be loaded. Please refresh and try again.');
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleMarkResolved = async (ticketId) => {
        const ticketRef = doc(db, COLLECTIONS.support, ticketId);
        await updateDoc(ticketRef, { status: 'Resolved' });
    };

    const categories = Array.from(new Set(tickets.map((ticket) => ticket.category).filter(Boolean)));

    const filtered = tickets.filter((ticket) => {
        const searchText = `${ticket.name} ${ticket.email} ${ticket.category} ${ticket.message}`.toLowerCase();
        return (
            (statusFilter === 'All' || ticket.status === statusFilter) &&
            (categoryFilter === 'All' || ticket.category === categoryFilter) &&
            searchText.includes(search.toLowerCase())
        );
    });

    return (
        <div className="panel-section">
            <div className="section-header">
                <div>
                    <h2>Support Tickets</h2>
                    <p>{filtered.length} of {tickets.length} tickets</p>
                </div>
            </div>

            <div className="filters-bar">
                <input
                    type="text"
                    placeholder="Search tickets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                </select>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="All">All Categories</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </div>

            <div className="table-shell">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Category</th>
                            <th>Message</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableLoadingRow colSpan={6} message="Loading support tickets..." detail="Preparing customer messages and statuses." />
                        ) : loadError ? (
                            <tr><td colSpan="6" className="table-error-cell">{loadError}</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="6" className="no-data">No support tickets found</td></tr>
                        ) : (
                            filtered.map((ticket) => (
                                <tr key={ticket.id}>
                                    <td>
                                        <strong>{ticket.name || 'N/A'}</strong>
                                        <span className="muted-line">{ticket.email || 'N/A'}</span>
                                    </td>
                                    <td>{ticket.category}</td>
                                    <td className="message-cell">{ticket.message || 'N/A'}</td>
                                    <td><span className="status-pill">{ticket.status}</span></td>
                                    <td>{formatDateTime(ticket.createdAt)}</td>
                                    <td>
                                        <div className="actions-row">
                                            <button
                                                className="view-btn"
                                                onClick={() => {
                                                    setSelectedTicket(ticket);
                                                    setModalOpen(true);
                                                }}
                                            >
                                                View
                                            </button>
                                            {ticket.status === 'Pending' && (
                                                <button
                                                    className="resolve-btn"
                                                    onClick={() => handleMarkResolved(ticket.id)}
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <DetailModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Support Ticket Details"
                data={selectedTicket || {}}
            />
        </div>
    );
};

export default SupportTable;
