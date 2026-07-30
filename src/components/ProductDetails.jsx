import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    COLLECTIONS,
    formatAddress,
    formatBoolean,
    formatCurrency,
    formatDate,
    formatName,
    normalizeOrder,
    normalizeProduct,
    normalizeVariation
} from '../utils/adminModels';
import '../styles/ProductDetails.css';

const ProductDetails = () => {
    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [variations, setVariations] = useState([]);
    const [raffleData, setRaffleData] = useState([]);
    const [winner, setWinner] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProductData = async () => {
            try {
                const productRef = doc(db, COLLECTIONS.products, productId);
                const productSnap = await getDoc(productRef);

                if (!productSnap.exists()) return;

                const productData = normalizeProduct(productSnap);
                setProduct(productData);

                const variationSnap = await getDocs(collection(db, COLLECTIONS.products, productId, 'variations'));
                const variationData = variationSnap.docs.map(normalizeVariation);
                setVariations(variationData);

                if (productData.kind === 'Raffle') {
                    const map = new Map();

                    productData.spotCount?.forEach((userId, index) => {
                        if (!map.has(userId)) {
                            map.set(userId, { count: 0, price: 0, slots: [] });
                        }
                        const entry = map.get(userId);
                        entry.count++;
                        entry.price += productData.priceChargedFromUser?.[index] || 0;
                        entry.slots.push(index + 1);
                    });

                    const raffleArray = await Promise.all(
                        Array.from(map.entries()).map(async ([userId, data]) => {
                            const userSnap = await getDoc(doc(db, COLLECTIONS.users, userId));
                            return {
                                user: userSnap.exists() ? userSnap.data() : { email: userId },
                                totalPaid: data.price,
                                slots: data.slots
                            };
                        })
                    );

                    setRaffleData(raffleArray);

                    if (productData.winnerId) {
                        const winnerSnap = await getDoc(doc(db, COLLECTIONS.users, productData.winnerId));
                        if (winnerSnap.exists()) setWinner(winnerSnap.data());
                    }
                } else {
                    const ordersQuery = query(collection(db, COLLECTIONS.orders), where('productId', '==', productId));
                    const ordersSnap = await getDocs(ordersQuery);
                    const productOrders = ordersSnap.docs.map(normalizeOrder);
                    setOrders(productOrders);
                }
            } catch (error) {
                console.error('Error loading product details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProductData();
    }, [productId]);

    const handleDeleteImage = async (index) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this image?');
        if (!confirmDelete) return;

        try {
            const updatedImages = [...product.images];
            updatedImages.splice(index, 1);
            await updateDoc(doc(db, COLLECTIONS.products, productId), { images: updatedImages });
            setProduct(prev => ({ ...prev, images: updatedImages }));
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    const handleDeleteProduct = async () => {
        const confirmDelete = window.confirm('Are you sure you want to delete this product?');
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, COLLECTIONS.products, productId));
            window.close();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    return (
        <div className="product-detail-container">
            {loading ? (
                <p>Loading product details...</p>
            ) : product ? (
                <>
                    <div className="product-images-slider">
                        <div className="slider-container">
                            {product.images?.length > 0 ? product.images.map((img, idx) => (
                                <div key={idx} className="slider-image-wrapper">
                                    <img src={img} alt={`product-${idx}`} className="slider-image" />
                                    <button className="delete-image-btn" onClick={() => handleDeleteImage(idx)}>Remove</button>
                                </div>
                            )) : <div className="empty-media">No product images</div>}
                        </div>
                    </div>

                    <div className="product-info">
                        <h2>{product.title}</h2>
                        <p><strong>Description:</strong> {product.description || 'N/A'}</p>
                        <p><strong>Price:</strong> {formatCurrency(product.price)}</p>
                        <p><strong>Status:</strong> {product.productStatus}</p>
                        <p><strong>Approved:</strong> {formatBoolean(product.isApproved)}</p>
                        <p><strong>Category:</strong> {product.productType}</p>
                        <p><strong>Sub Category:</strong> {product.subCategory}</p>
                        <p><strong>Tracking ID:</strong> {product.trackingIDOfProduct || 'N/A'}</p>
                        <p><strong>Estimated Shipping:</strong> {formatCurrency(product.estimatedShippingCost)}</p>
                        <p><strong>Shipping Hold:</strong> {formatCurrency(product.shippingHoldAmount)}</p>
                        <p><strong>Shipping Cost:</strong> {formatCurrency(product.shippingCost)}</p>
                        <p><strong>Seller Free Delivery:</strong> {formatBoolean(product.freeDeliveryBySeller)}</p>
                        <p><strong>HG Free Delivery:</strong> {formatBoolean(product.freeDeliveryByHG)}</p>

                        {product.kind !== 'Raffle' ? (
                            <p><strong>Product Upload Date:</strong> {formatDate(product.uploadDate)}</p>
                        ) : (
                            <>
                                <p><strong>Raffle Start Date:</strong> {formatDate(product.eventStartDate)}</p>
                                <p><strong>Raffle End Date:</strong> {formatDate(product.eventEndDate)}</p>
                                <p><strong>Total Entries Allowed:</strong> {product.spot}</p>
                                <p><strong>Total Spots Taken:</strong> {product.spotCount?.length || 0}</p>
                            </>
                        )}
                    </div>

                    <div className="variation-section">
                        <h3>Product Variations</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Size</th><th>Brand</th><th>Model</th><th>Condition</th><th>Price</th><th>Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variations.length > 0 ? variations.map((v, idx) => (
                                    <tr key={idx}>
                                        <td>{v.size}</td>
                                        <td>{v.brand}</td>
                                        <td>{v.model}</td>
                                        <td>{v.condition}</td>
                                        <td>{formatCurrency(v.price)}</td>
                                        <td>{v.quantity}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6">No variations found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {product.kind === 'Raffle' && (
                        <>
                            <div className="raffle-section">
                                <h3>Raffle Participants</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>User Details</th><th>Total Price Charged</th><th>Slots Purchased</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {raffleData.length > 0 ? raffleData.map((entry, idx) => (
                                            <tr key={idx}>
                                                <td>{formatName(entry.user)} ({entry.user.email})</td>
                                                <td>{formatCurrency(entry.totalPaid)}</td>
                                                <td>{entry.slots.join(', ')}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3">No participants found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {winner && (
                                <div className="winner-section">
                                    <h3>Winner Details</h3>
                                    <p><strong>Name:</strong> {formatName(winner)}</p>
                                    <p><strong>Email:</strong> {winner.email}</p>
                                    <p><strong>Address:</strong> {formatAddress(winner)}</p>
                                    {product.winningSlotNumber && (
                                        <p><strong>Winning Slot Number:</strong> {product.winningSlotNumber}</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {product.kind !== 'Raffle' && (
                        <div className="orders-section">
                            <h3>Orders for This Product</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order ID</th><th>Quantity</th><th>Status</th><th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.length > 0 ? orders.map((o, idx) => (
                                        <tr key={idx}>
                                            <td>{o.orderId}</td>
                                            <td>{o.quantity}</td>
                                            <td>{o.orderStatus}</td>
                                            <td>{formatDate(o.orderDate)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4">No orders found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ marginTop: '40px' }}>
                        <button className="resolve-btn" onClick={handleDeleteProduct}>Delete Product</button>
                    </div>
                </>
            ) : <p>Product not found.</p>}
        </div>
    );
};

export default ProductDetails;
