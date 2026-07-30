import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, formatDateTime, formatName } from '../utils/adminModels';
import '../AdminPanel.css';

const DetailModal = ({ isOpen, onClose, title, data }) => {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            setUserData(null);
            if (data?.userId) {
                const docRef = doc(db, COLLECTIONS.users, data.userId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                }
            }
        };
        fetchUser();
    }, [data]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target.className === 'modal-overlay') {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleBackdropClick}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">x</button>
                <h2>{title}</h2>
                <div className="modal-grid">
                    <div className="modal-row">
                        <span>Name</span>
                        <strong>{data.name || 'N/A'}</strong>
                    </div>
                    <div className="modal-row">
                        <span>Email</span>
                        <strong>{data.email || 'N/A'}</strong>
                    </div>
                    <div className="modal-row">
                        <span>Category</span>
                        <strong>{data.category || 'N/A'}</strong>
                    </div>
                    <div className="modal-row">
                        <span>Status</span>
                        <strong>{data.status || 'N/A'}</strong>
                    </div>
                    <div className="modal-row">
                        <span>Created</span>
                        <strong>{formatDateTime(data.createdAt)}</strong>
                    </div>
                    <div className="modal-row modal-row-wide">
                        <span>Message</span>
                        <strong>{data.message || 'N/A'}</strong>
                    </div>
                    {userData && (
                        <div className="modal-row modal-row-wide">
                            <span>Linked User</span>
                            <strong>{formatName(userData)} ({userData.email || 'N/A'})</strong>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DetailModal;
