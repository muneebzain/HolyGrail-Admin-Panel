import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
    COLLECTIONS,
    formatAddress,
    formatCurrency,
    formatDate,
    formatName,
    normalizeOrder,
    normalizeProduct,
    normalizeVariation,
    toDate
} from '../utils/adminModels';
import { TableLoadingRow } from './LoadingState';

const OrderTable = () => {
    const [enrichedOrders, setEnrichedOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateSort, setDateSort] = useState('desc');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, COLLECTIONS.orders), async (snapshot) => {
            setLoading(true);
            setLoadError('');

            try {
                const rawOrders = snapshot.docs.map(normalizeOrder);
                const enriched = await Promise.all(
                    rawOrders.map(async (order) => {
                        let product = null;
                        let variation = null;
                        let buyer = null;
                        let seller = null;

                        try {
                            if (order.productId) {
                                const productDoc = await getDoc(doc(db, COLLECTIONS.products, order.productId));
                                if (productDoc.exists()) product = normalizeProduct(productDoc);

                                if (order.variantId) {
                                    const variationDoc = await getDoc(doc(db, COLLECTIONS.products, order.productId, 'variations', order.variantId));
                                    if (variationDoc.exists()) variation = normalizeVariation(variationDoc);
                                }
                            }

                            if (order.buyerId) {
                                const buyerDoc = await getDoc(doc(db, COLLECTIONS.users, order.buyerId));
                                if (buyerDoc.exists()) buyer = buyerDoc.data();
                            }

                            if (order.sellerId) {
                                const sellerDoc = await getDoc(doc(db, COLLECTIONS.users, order.sellerId));
                                if (sellerDoc.exists()) seller = sellerDoc.data();
                            }
                        } catch (err) {
                            console.error('Enrichment error for order:', order.orderId, err);
                        }

                        return {
                            ...order,
                            productTitle: product?.title || 'N/A',
                            productImage: product?.images?.[0] || '',
                            variation,
                            buyerName: buyer ? formatName(buyer) : 'N/A',
                            buyerAddress: buyer ? formatAddress(buyer) : 'N/A',
                            sellerName: seller ? formatName(seller) : 'N/A'
                        };
                    })
                );

                setEnrichedOrders(enriched);
            } catch (error) {
                console.error('Error loading orders:', error);
                setLoadError('Orders could not be loaded. Please refresh and try again.');
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error('Orders listener error:', error);
            setLoadError('Orders could not be loaded. Please refresh and try again.');
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filtered = useMemo(() => enrichedOrders
        .filter((order) => {
            const searchText = `${order.orderId} ${order.productTitle} ${order.buyerName} ${order.sellerName}`.toLowerCase();
            return searchText.includes(search.toLowerCase());
        })
        .filter((order) => statusFilter === 'All' || order.orderStatus?.toLowerCase() === statusFilter.toLowerCase())
        .sort((a, b) => {
            const dateA = toDate(a.orderDate)?.getTime() || 0;
            const dateB = toDate(b.orderDate)?.getTime() || 0;
            return dateSort === 'asc' ? dateA - dateB : dateB - dateA;
        }), [dateSort, enrichedOrders, search, statusFilter]);

    return (
        <div className="panel-section">
            <div className="section-header">
                <div>
                    <h2>Orders</h2>
                    <p>{filtered.length} of {enrichedOrders.length} orders</p>
                </div>
            </div>

            <div className="filters-bar">
                <input
                    type="text"
                    placeholder="Search orders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
                <select
                    value={dateSort}
                    onChange={(e) => setDateSort(e.target.value)}
                    aria-label="Sort orders by date"
                >
                    <option value="desc">Newest to Oldest</option>
                    <option value="asc">Oldest to Newest</option>
                </select>
            </div>

            <div className="table-shell">
                <table>
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Product</th>
                            <th>Variant</th>
                            <th>Buyer</th>
                            <th>Seller</th>
                            <th>Total</th>
                            <th>Tracking</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableLoadingRow
                                colSpan={9}
                                message="Loading orders..."
                                detail="Preparing product, buyer, and seller details."
                            />
                        ) : loadError ? (
                            <tr><td colSpan="9" className="table-error-cell">{loadError}</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="9" className="no-data">No orders found</td></tr>
                        ) : (
                            filtered.map((order) => (
                                <tr key={order.id}>
                                    <td>
                                        <strong>{order.orderId}</strong>
                                        <span className="muted-line">{formatDate(order.orderDate)}</span>
                                    </td>
                                    <td>
                                        <div className="entity-cell">
                                            {order.productImage ? (
                                                <img src={order.productImage} alt={order.productTitle} />
                                            ) : (
                                                <span className="empty-thumb">No image</span>
                                            )}
                                            <div>
                                                <strong>{order.productTitle}</strong>
                                                <span>Qty {order.quantity || 1}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {order.variation ? (
                                            <div className="compact-details">
                                                <span>{order.variation.brand || 'N/A'} {order.variation.model || ''}</span>
                                                <span>Size {order.variation.size || 'N/A'}</span>
                                                <span>{order.variation.condition || 'N/A'}</span>
                                            </div>
                                        ) : 'N/A'}
                                    </td>
                                    <td>
                                        <strong>{order.buyerName}</strong>
                                        <span className="muted-line">{order.buyerAddress}</span>
                                    </td>
                                    <td>{order.sellerName}</td>
                                    <td>{formatCurrency(order.paidByBuyer)}</td>
                                    <td>
                                        <strong>{order.trackingNumber || 'N/A'}</strong>
                                        <span className="muted-line">{order.shippingProvider || ''}</span>
                                    </td>
                                    <td><span className="status-pill">{order.orderStatus}</span></td>
                                    <td>
                                        <Link to={`/order/${order.id}`} className="view-btn">
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

export default OrderTable;
