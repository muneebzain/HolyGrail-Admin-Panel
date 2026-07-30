import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
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
import '../styles/UserDetails.css';

const UserDetails = () => {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                if (!id) {
                    console.error("User ID not found in URL params.");
                    return;
                }

                const userRef = doc(db, COLLECTIONS.users, id);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = normalizeUser(userSnap);
                    setUser(userData);

                    const ordersSnap = await getDocs(collection(db, COLLECTIONS.orders));
                    const ordersData = await Promise.all(
                        ordersSnap.docs.map(async docSnap => {
                            const data = normalizeOrder(docSnap);
                            if (data.buyerId !== id) return null;

                            const productRef = doc(db, COLLECTIONS.products, data.productId);
                            const productSnap = await getDoc(productRef);
                            const productData = productSnap.exists() ? normalizeProduct(productSnap) : null;

                            let variationData = null;
                            if (data.productId && data.variantId) {
                                const variationRef = doc(db, COLLECTIONS.products, data.productId, 'variations', data.variantId);
                                const variationSnap = await getDoc(variationRef);
                                variationData = variationSnap.exists() ? normalizeVariation(variationSnap) : null;
                            }

                            return {
                                ...data,
                                productTitle: productData?.title || 'N/A',
                                productImage: productData?.images?.[0] || '',
                                variation: variationData || null
                            };
                        })
                    );
                    setOrders(ordersData.filter(Boolean));

                    const productsSnap = await getDocs(collection(db, COLLECTIONS.products));
                    const productsData = productsSnap.docs
                        .map(normalizeProduct)
                        .filter((product) => product.sellerId === id);
                    setProducts(productsData);
                } else {
                    console.warn('User not found for ID:', id);
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [id]);

    return (
        <div className="user-detail-container">
            <div className="user-section">
                <h2>User Details</h2>
                {loading ? (
                    <p>Loading user details...</p>
                ) : user ? (
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
                        {products.length > 0 ? (
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
                        {orders.length > 0 ? (
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
