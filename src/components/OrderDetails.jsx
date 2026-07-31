import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiCheckCircle, FiChevronDown, FiDollarSign, FiSave, FiTruck } from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    COLLECTIONS,
    formatAddress,
    formatBoolean,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatName,
    normalizeOrder,
    normalizeProduct,
    normalizeUser,
    normalizeVariation
} from '../utils/adminModels';
import {
    releaseSellerFunds,
    saveShippingLabel,
    updateOrderStatus
} from '../services/adminApi';
import LoadingState from './LoadingState';
import DetailBackButton from './DetailBackButton';
import '../styles/OrderDetails.css';

const carriers = ['USPS', 'UPS', 'FedEx', 'DHL Express', 'OnTrac', 'Other'];

const emptyForm = {
    shippingLabelId: '',
    shippingLabelUrl: '',
    trackingNumber: '',
    shippingCost: '',
    shippingAdminFee: '0',
    provider: 'USPS'
};

const dollarsToCents = (value) => Math.round(Number(value || 0) * 100);

const OrderDetails = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [buyer, setBuyer] = useState(null);
    const [seller, setSeller] = useState(null);
    const [product, setProduct] = useState(null);
    const [variation, setVariation] = useState(null);
    const [shippingForm, setShippingForm] = useState(emptyForm);
    const [busyAction, setBusyAction] = useState('');
    const [notice, setNotice] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchOrderDetails = useCallback(async () => {
        setLoading(true);
        try {
            const orderSnap = await getDoc(doc(db, COLLECTIONS.orders, orderId));
            if (!orderSnap.exists()) {
                setOrder(null);
                return;
            }

            const orderData = normalizeOrder(orderSnap);
            setOrder(orderData);
            setShippingForm({
                shippingLabelId: orderData.shippingLabelId || '',
                shippingLabelUrl: orderData.shippingLabelUrl || '',
                trackingNumber: orderData.trackingNumber || '',
                shippingCost: orderData.shippingCost === '' ? '' : String(orderData.shippingCost),
                shippingAdminFee: orderData.shippingAdminFee === undefined ? '0' : String(orderData.shippingAdminFee),
                provider: orderData.shippingProvider || 'USPS'
            });

            const [buyerSnap, sellerSnap, productSnap, variationSnap] = await Promise.all([
                orderData.buyerId ? getDoc(doc(db, COLLECTIONS.users, orderData.buyerId)) : null,
                orderData.sellerId ? getDoc(doc(db, COLLECTIONS.users, orderData.sellerId)) : null,
                orderData.productId ? getDoc(doc(db, COLLECTIONS.products, orderData.productId)) : null,
                orderData.productId && orderData.variantId
                    ? getDoc(doc(db, COLLECTIONS.products, orderData.productId, 'variations', orderData.variantId))
                    : null
            ]);

            setBuyer(buyerSnap?.exists() ? normalizeUser(buyerSnap) : null);
            setSeller(sellerSnap?.exists() ? normalizeUser(sellerSnap) : null);

            if (productSnap?.exists()) {
                setProduct(normalizeProduct(productSnap));
                setVariation(variationSnap?.exists() ? normalizeVariation(variationSnap) : null);
            } else {
                setProduct(null);
                setVariation(null);
            }
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to load this order.' });
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    const payoutStatus = String(order?.sellerEarningsStatus || order?.sellerPayoutStatus || '').toLowerCase();
    const payoutStarted = ['pending_clearance', 'pending', 'available', 'released', 'transferred'].includes(payoutStatus);
    const isDelivered = String(order?.orderStatus || '').toLowerCase() === 'delivered';
    const isShipped = ['shipped', 'delivered'].includes(String(order?.orderStatus || '').toLowerCase());
    const hasShippingDetails = Boolean(order?.shippingLabelId && order?.trackingNumber);

    const workflowStep = useMemo(() => {
        if (payoutStarted) return 4;
        if (isDelivered) return 3;
        if (isShipped) return 2;
        if (hasShippingDetails) return 1;
        return 0;
    }, [hasShippingDetails, isDelivered, isShipped, payoutStarted]);

    const updateForm = (event) => {
        const { name, value } = event.target;
        setShippingForm((current) => ({ ...current, [name]: value }));
    };

    const runAction = async (name, action, successText) => {
        setBusyAction(name);
        setNotice(null);
        try {
            await action();
            setNotice({ type: 'success', text: successText });
        } catch (error) {
            setNotice({ type: 'error', text: error.message });
        } finally {
            await fetchOrderDetails();
            setBusyAction('');
        }
    };

    const handleShippingLabel = (event) => {
        event.preventDefault();
        runAction('label', () => saveShippingLabel(order.orderId, {
            shippingLabelUrl: shippingForm.shippingLabelUrl.trim(),
            trackingNumber: shippingForm.trackingNumber.trim(),
            shippingCost: dollarsToCents(shippingForm.shippingCost),
            shippingAdminFee: dollarsToCents(shippingForm.shippingAdminFee),
            provider: shippingForm.provider
        }), 'Shipping details saved. The order is now shown as Shipped in the app.');
    };

    const handleDelivered = () => {
        if (!window.confirm('Confirm that this order has been delivered?')) return;
        runAction(
            'delivery',
            () => updateOrderStatus(order.orderId, 'Delivered'),
            'Delivery confirmed. Seller funds are now eligible for release.'
        );
    };

    const handleRelease = () => {
        if (!window.confirm('Release the seller funds into the clearance period?')) return;
        runAction(
            'funds',
            () => releaseSellerFunds(order.orderId),
            'Seller funds were released into pending clearance.'
        );
    };

    if (loading && !order) return <LoadingState message="Loading order..." detail="Preparing order, product, buyer, and seller details." fullPage />;
    if (!order) return <div className="page-error-state full-page-state">Order not found.</div>;

    const images = product?.images || [];
    const productShippingCharge = product?.freeDeliveryBySeller || product?.freeDeliveryByHG
        ? 0
        : [product?.shippingCost, product?.estimatedShippingCost, product?.shippingHoldAmount]
            .map(Number)
            .find((value) => Number.isFinite(value) && value > 0) ?? 0;
    const shippingCharge = order.shippingCharge === ''
        ? productShippingCharge
        : order.shippingCharge;

    return (
        <main className="order-details-wrapper">
            <div className="order-page-header">
                <DetailBackButton />
                <div>
                    <span className="admin-kicker">Order Operations</span>
                    <h1>Order {order.orderId}</h1>
                    <p>Manage shipping details, delivery confirmation, and fund release.</p>
                </div>
                <span className={`order-status status-${String(order.orderStatus).toLowerCase()}`}>
                    {order.orderStatus}
                </span>
            </div>

            <section className="workflow-strip" aria-label="Order workflow">
                {['Shipping saved', 'In transit', 'Delivered', 'Funds released'].map((label, index) => (
                    <div className={workflowStep >= index + 1 ? 'workflow-item complete' : 'workflow-item'} key={label}>
                        <span>{workflowStep > index + 1 ? '✓' : index + 1}</span>
                        <strong>{label}</strong>
                    </div>
                ))}
            </section>

            {notice && <div className={`operation-notice ${notice.type}`}>{notice.text}</div>}

            <div className="order-operations-grid">
                <section className="operations-column">
                    <form className="operations-card" onSubmit={handleShippingLabel}>
                        <div className="card-heading">
                            <FiTruck />
                            <div>
                                <h2>Shipping Details</h2>
                                <p>Save the shipment here, then email the label to the seller manually.</p>
                            </div>
                        </div>

                        <div className="form-grid">
                            <label>
                                Label ID
                                <input value={shippingForm.shippingLabelId} placeholder="Generated when saved" readOnly />
                            </label>
                            <label className="full-field">
                                Shipping label link
                                <input type="url" name="shippingLabelUrl" value={shippingForm.shippingLabelUrl} onChange={updateForm} placeholder="https://..." required />
                            </label>
                            <label>
                                Tracking number
                                <input name="trackingNumber" value={shippingForm.trackingNumber} onChange={updateForm} required />
                            </label>
                            <label>
                                Carrier
                                <span className="select-control">
                                    <select name="provider" value={shippingForm.provider} onChange={updateForm}>
                                        {carriers.map((carrier) => <option key={carrier}>{carrier}</option>)}
                                    </select>
                                    <FiChevronDown aria-hidden="true" />
                                </span>
                            </label>
                            <label>
                                Label cost (USD)
                                <input type="number" min="0" step="0.01" name="shippingCost" value={shippingForm.shippingCost} onChange={updateForm} required />
                            </label>
                            <label>
                                Admin fee (USD)
                                <input type="number" min="0" step="0.01" name="shippingAdminFee" value={shippingForm.shippingAdminFee} onChange={updateForm} />
                            </label>
                        </div>

                        <div className="operation-footer">
                            <div>
                                <strong>{hasShippingDetails ? 'Shipping details saved' : 'Shipping details not saved'}</strong>
                                <span>{hasShippingDetails ? `Label ID: ${order.shippingLabelId}` : 'A unique label ID will be generated automatically.'}</span>
                            </div>
                            <button type="submit" className="primary-action" disabled={busyAction !== ''}>
                                <FiSave /> {busyAction === 'label' ? 'Saving...' : hasShippingDetails ? 'Update Shipping Details' : 'Save Shipping Details'}
                            </button>
                        </div>
                    </form>

                    <section className="operations-card">
                        <div className="card-heading">
                            <FiTruck />
                            <div>
                                <h2>Delivery & Funds</h2>
                                <p>Confirm delivery before releasing the seller’s funds.</p>
                            </div>
                        </div>

                        <div className="release-actions">
                            <div className={isDelivered ? 'release-step ready' : 'release-step'}>
                                <FiCheckCircle />
                                <div>
                                    <strong>{isDelivered ? 'Delivery confirmed' : 'Waiting for delivery'}</strong>
                                    <span>{order.deliveredAt ? formatDateTime(order.deliveredAt) : 'Confirm only after carrier delivery.'}</span>
                                </div>
                                <button
                                    type="button"
                                    className="secondary-action"
                                    disabled={!hasShippingDetails || isDelivered || busyAction !== ''}
                                    onClick={handleDelivered}
                                >
                                    {busyAction === 'delivery' ? 'Confirming...' : 'Mark Delivered'}
                                </button>
                            </div>

                            <div className={isDelivered && !payoutStarted ? 'release-step ready' : 'release-step'}>
                                <FiDollarSign />
                                <div>
                                    <strong>{payoutStarted ? 'Funds processed' : 'Release seller funds'}</strong>
                                    <span>{order.sellerEarningsStatus || order.sellerPayoutStatus || 'Held until delivery'}</span>
                                </div>
                                <button
                                    type="button"
                                    className="primary-action"
                                    disabled={!isDelivered || payoutStarted || busyAction !== ''}
                                    onClick={handleRelease}
                                >
                                    <FiDollarSign /> {busyAction === 'funds' ? 'Releasing...' : 'Release Funds'}
                                </button>
                            </div>
                        </div>
                    </section>
                </section>

                <aside className="summary-column">
                    <section className="summary-card product-summary">
                        {images[0] ? <img src={images[0]} alt={product?.title || 'Product'} /> : <div className="empty-media">No image</div>}
                        <h2>{product?.title || 'Product unavailable'}</h2>
                        <p>{variation ? [variation.brand, variation.model, variation.size && `Size ${variation.size}`].filter(Boolean).join(' · ') : 'No variant details'}</p>
                    </section>

                    <section className="summary-card">
                        <h3>Order Summary</h3>
                        <dl>
                            <div><dt>Date</dt><dd>{formatDate(order.orderDate)}</dd></div>
                            <div><dt>Quantity</dt><dd>{order.quantity}</dd></div>
                            <div><dt>Buyer paid</dt><dd>{formatCurrency(order.paidByBuyer)}</dd></div>
                            <div><dt>Seller earns</dt><dd>{formatCurrency(order.sellerNetAfterShipping ?? order.sellerMade)}</dd></div>
                            <div><dt>Shipping cost</dt><dd>{formatCurrency(shippingCharge)}</dd></div>
                            <div><dt>Label cost</dt><dd>{formatCurrency(order.shippingCost)}</dd></div>
                            <div><dt>Tracking</dt><dd>{order.trackingNumber || 'Not assigned'}</dd></div>
                        </dl>
                    </section>

                    <section className="summary-card">
                        <h3>Seller</h3>
                        <p><strong>{seller ? formatName(seller) : 'N/A'}</strong></p>
                        <p>{seller?.email || 'No email'}</p>
                    </section>

                    <section className="summary-card">
                        <h3>Buyer & Delivery</h3>
                        <p><strong>{buyer ? formatName(buyer) : 'N/A'}</strong></p>
                        <p>{buyer ? formatAddress(buyer) : 'No delivery address'}</p>
                    </section>

                    <section className="summary-card">
                        <h3>Variant Checks</h3>
                        <dl>
                            <div><dt>Condition</dt><dd>{variation?.condition || 'N/A'}</dd></div>
                            <div><dt>OG Box</dt><dd>{formatBoolean(variation?.ogbox)}</dd></div>
                            <div><dt>Receipt</dt><dd>{formatBoolean(variation?.receipt)}</dd></div>
                        </dl>
                    </section>
                </aside>
            </div>
        </main>
    );
};

export default OrderDetails;
