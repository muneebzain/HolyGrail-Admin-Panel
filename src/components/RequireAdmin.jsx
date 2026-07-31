import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import LoadingState from './LoadingState';

const ADMIN_EMAIL = 'adminholygrail@gmail.com';

const RequireAdmin = ({ children }) => {
    const [checking, setChecking] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => onAuthStateChanged(auth, (user) => {
        setIsAdmin(user?.email?.toLowerCase() === ADMIN_EMAIL);
        setChecking(false);
    }), []);

    if (checking) return <LoadingState message="Checking admin access..." detail="Verifying your secure session." fullPage />;
    return isAdmin ? children : <Navigate to="/" replace />;
};

export default RequireAdmin;
