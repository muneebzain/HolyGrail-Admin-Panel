import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
    COLLECTIONS,
    formatAddress,
    formatCurrency,
    formatName,
    normalizeOrder,
    normalizeProduct,
    normalizeUser,
    normalizeVariation
} from '../utils/adminModels';
import LoadingState, { TableLoadingRow } from './LoadingState';
import DetailBackButton from './DetailBackButton';
import '../styles/UserDetails.css';

const UserDetails = () => {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [relatedLoading, setRelatedLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let active = true;

        const fetchUserData = async () => {
            setLoading(true);
            setRelatedLoading(true);
            setLoadError('');

            try {
                if (!id) {
                    setLoadError('User ID was not found.');
                    return;
                }

                const ordersRef = collection(db, COLLECTIONS.orders);
                const productsRef = collection(db, COLLECTIONS.products);
                const relatedRequest = Promise.all([
                    getDocs(query(ordersRef, where('purchasedBy', '==', id))),
                    getDocs(query(ordersRef, where('buyerId', '==', id))),
                    getDocs(query(productsRef, where('userId', '==', id))),
                    getDocs(query(productsRef, where('sellerId', '==', id)))
                ]);

                const userSnap = await getDoc(doc(db, COLLECTIONS.users, id));
                if (!active) return;

                if (!userSnap.exists()) {
                    setUser(null);
                    setLoadError('User not found.');
                    return;
                }

                setUser(normalizeUser(userSnap));
                setLoading(false);

                const [purchasedOrdersSnap, buyerOrdersSnap, uploadedProductsSnap, sellerProductsSnap] = await relatedRequest;
                if (!active) return;

                const orderDocs = Array.from(new Map(
                    [...purchasedOrdersSnap.docs, ...buyerOrdersSnap.docs].map((snapshot) => [snapshot.id, snapshot])
                ).values());
                const productDocs = Array.from(new Map(
                    [...uploadedProductsSnap.docs, ...sellerProductsSnap.docs].map((snapshot) => [snapshot.id, snapshot])
                ).values());
                const normalizedOrders = orderDocs.map(normalizeOrder);
                const productIds = [...new Set(normalizedOrders.map((order) => order.productId).filter(Boolean))];
                const variationKeys = [...new Map(
                    normalizedOrders
                        .filter((order) => order.productId && order.variantId)
                        .map((order) => [`${order.productId}/${order.variantId}`, order])
                ).values()];

                const [purchasedProductSnaps, variationSnaps] = await Promise.all([
                    Promise.all(productIds.map((productId) => getDoc(doc(db, COLLECTIONS.products, productId)))),
                    Promise.all(variationKeys.map((order) => getDoc(doc(
                        db,
                        COLLECTIONS.products,
                        order.productId,
                        'variations',
                        order.variantId
                    ))))
                ]);
                if (!active) return;

                const purchasedProducts = new Map(
                    purchasedProductSnaps
                        .filter((snapshot) => snapshot.exists())
                        .map((snapshot) => [snapshot.id, normalizeProduct(snapshot)])
                );
                const variations = new Map(
                    variationSnaps
                        .filter((snapshot) => snapshot.exists())
                        .map((snapshot) => {
                            const variation = normalizeVariation(snapshot);
                            return [`${snapshot.ref.parent.parent.id}/${snapshot.id}`, variation];
                        })
                );

                setProducts(productDocs.map(normalizeProduct));
                setOrders(normalizedOrders.map((order) => {
                    const product = purchasedProducts.get(order.productId);
                    return {
                        ...order,
                        productTitle: product?.title || 'N/A',
                        productImage: product?.images?.[0] || '',
                        variation: variations.get(`${order.productId}/${order.variantId}`) || null
                    };
                }));
            } catch (error) {
                console.error('Error fetching user details:', error);
                if (active) setLoadError('Unable to load all user details. Please try again.');
            } finally {
                if (active) {
                    setLoading(false);
                    setRelatedLoading(false);
                }
            }
        };

        fetchUserData();
        return () => {
            active = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="user-detail-container">
                <div className="detail-page-toolbar"><DetailBackButton /></div>
                <LoadingState message="Loading user details..." detail="Preparing account, products, and order history." />
            </div>
        );
    }

    return (
        <div className="user-detail-container">
            <div className="detail-page-toolbar"><DetailBackButton /></div>
            {loadError && <div className="user-section">{loadError}</div>}
            <div className="user-section">
                <h2>User Details</h2>
                {user ? (
                    <>
                        <p><strong>Name:</strong> {formatName(user)}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Address:</strong> {formatAddress(user)}</p>
                        <p><strong>Grail Wallet:</strong> {formatCurrency(user.grailWallet)}</p>
                        <p><strong>Grail Coins:</strong> {user.grailCoin || 0}</p>
                        <p><strong>Seller Status:</strong> {user.sellerStatus || 'N/A'}</p>
                        <p><strong>Sign Up Provider:</strong> {user.signUpProvider || 'N/A'}</p>
                    </>
                ) : (
                    <p>User not found.</p>
                )}
            </div>

            <div className="user-section">
                <h3>Products Uploaded</h3>
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Description</th>
                            <th>Price</th>
                            <th>Image</th>
                        </tr>
                    </thead>
                    <tbody>
                        {relatedLoading ? (
                            <TableLoadingRow colSpan={4} message="Loading products..." detail="Retrieving this user's listings." />
                        ) : products.length > 0 ? (
                            products.map(product => (
                                <tr key={product.id}>
                                    <td>{product.title}</td>
                                    <td>{product.description}</td>
                                    <td>{formatCurrency(product.price)}</td>
                                    <td>
                                        {product.images && product.images.length > 0 ? (
                                            <img src={product.images[0]} alt="product" width="50" />
                                        ) : 'No Image'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4">No products uploaded.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="user-section">
                <h3>Purchased Orders</h3>
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Product</th>
                            <th>Variation</th>
                            <th>Image</th>
                            <th>Quantity</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {relatedLoading ? (
                            <TableLoadingRow colSpan={6} message="Loading orders..." detail="Retrieving purchases and product details." />
                        ) : orders.length > 0 ? (
                            orders.map(order => (
                                <tr key={order.id}>
                                    <td>{order.orderId}</td>
                                    <td>{order.productTitle}</td>
                                    <td>
                                        {order.variation ? (
                                            <>
                                                Size: {order.variation.size}<br />
                                                Model: {order.variation.model}<br />
                                                Brand: {order.variation.brand}<br />
                                                Condition: {order.variation.condition}<br />
                                                OG Box: {order.variation.ogbox}<br />
                                            </>
                                        ) : 'N/A'}
                                    </td>
                                    <td>
                                        {order.productImage ? (
                                            <img src={order.productImage} alt="Product" width="50" />
                                        ) : 'No Image'}
                                    </td>
                                    <td>{order.quantity || 1}</td>
                                    <td>{order.orderStatus}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6">No orders found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserDetails;
