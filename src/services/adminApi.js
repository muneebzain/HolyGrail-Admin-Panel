import { auth } from '../firebase';

const productionApiUrl = 'https://holugrail-sneaker-app.web.app/api';

const getApiBaseUrl = () => {
    if (process.env.REACT_APP_MARKETPLACE_API_URL) {
        return process.env.REACT_APP_MARKETPLACE_API_URL.replace(/\/$/, '');
    }

    return window.location.hostname === 'localhost' ? productionApiUrl : '/api';
};

const adminRequest = async (path, options = {}) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Your admin session has expired. Please sign in again.');
    }

    const token = await user.getIdToken();
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'The admin request could not be completed.');
    }

    return payload;
};

export const saveShippingLabel = (orderId, label) => adminRequest('/shipping/labels', {
    method: 'POST',
    body: JSON.stringify({ orderId, ...label })
});

export const updateOrderStatus = (orderId, status) => adminRequest(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
});

export const releaseSellerFunds = (orderId) => adminRequest(`/orders/${orderId}/release-funds`, {
    method: 'POST',
    body: JSON.stringify({})
});
