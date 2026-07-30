import React, { useEffect, useState } from 'react';
import '../styles/OrderDetails.css';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
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
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const OrderDetails = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [buyer, setBuyer] = useState(null);
    const [seller, setSeller] = useState(null);
    const [product, setProduct] = useState(null);
    const [variation, setVariation] = useState(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const orderRef = doc(db, COLLECTIONS.orders, orderId);
                const orderSnap = await getDoc(orderRef);
                if (!orderSnap.exists()) return;

                const orderData = normalizeOrder(orderSnap);
                setOrder(orderData);

                if (orderData.buyerId) {
                    const buyerRef = doc(db, COLLECTIONS.users, orderData.buyerId);
                    const buyerSnap = await getDoc(buyerRef);
                    if (buyerSnap.exists()) setBuyer(buyerSnap.data());
                }

                if (orderData.sellerId) {
                    const sellerRef = doc(db, COLLECTIONS.users, orderData.sellerId);
                    const sellerSnap = await getDoc(sellerRef);
                    if (sellerSnap.exists()) setSeller(sellerSnap.data());
                }

                if (orderData.productId) {
                    const productRef = doc(db, COLLECTIONS.products, orderData.productId);
                    const productSnap = await getDoc(productRef);
                    if (productSnap.exists()) {
                        const productData = normalizeProduct(productSnap);
                        setProduct(productData);

                        if (orderData.variantId) {
                            const variationRef = doc(db, COLLECTIONS.products, orderData.productId, 'variations', orderData.variantId);
                            const variationSnap = await getDoc(variationRef);
                            if (variationSnap.exists()) {
                                setVariation(normalizeVariation(variationSnap));
                            }
                        }
                    }
                }

            } catch (error) {
                console.error('Error fetching order details:', error);
            }
        };

        fetchOrderDetails();
    }, [orderId]);

    if (!order) return <div className="loading">Loading...</div>;

    const images = product?.images || [];

    const sliderSettings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1
    };

    return (
        <div className="order-details-wrapper">
            <div className="slider-section">
                {images.length > 0 ? (
                    <Slider {...sliderSettings}>
                        {images.map((img, idx) => (
                            <div key={idx} className="slider-img-box">
                                <img src={img} alt={`Product ${idx}`} />
                            </div>
                        ))}
                    </Slider>
                ) : (
                    <div className="empty-media">No product images</div>
                )}
            </div>

            <div className="info-section">
                <div className="info-card">
                    <h3>Order Information</h3>
                    <p><strong>Order ID:</strong> {order.orderId}</p>
                    <p><strong>Date:</strong> {formatDate(order.orderDate)}</p>
                    <p><strong>Status:</strong> {order.orderStatus}</p>
                    <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                    <p><strong>Paid by Buyer:</strong> {formatCurrency(order.paidByBuyer)}</p>
                    <p><strong>Seller Made:</strong> {formatCurrency(order.sellerMade)}</p>
                    <p><strong>Shipping Cost:</strong> {formatCurrency(order.shippingCost)}</p>
                    <p><strong>Tracking Number:</strong> {order.trackingNumber || order.shippingTag || 'N/A'}</p>
                    <p><strong>Shipping Provider:</strong> {order.shippingProvider || 'N/A'}</p>
                    <p><strong>Service Level:</strong> {order.shippingServiceLevel || 'N/A'}</p>
                    <p><strong>Seller Payout:</strong> {order.sellerPayoutStatus || 'N/A'}</p>
                    <p><strong>Marketplace Payment:</strong> {order.marketplacePaymentId || 'N/A'}</p>
                </div>

                <div className="info-card">
                    <h3>Product & Variant</h3>
                    <p><strong>Title:</strong> {product?.title || 'N/A'}</p>
                    <p><strong>Model:</strong> {variation?.model || 'N/A'}</p>
                    <p><strong>Brand:</strong> {variation?.brand || 'N/A'}</p>
                    <p><strong>Size:</strong> {variation?.size || 'N/A'}</p>
                    <p><strong>Condition:</strong> {variation?.condition || 'N/A'}</p>
                    <p><strong>OG Box:</strong> {formatBoolean(variation?.ogbox)}</p>
                    <p><strong>Receipt:</strong> {formatBoolean(variation?.receipt)}</p>
                </div>

                <div className="info-card">
                    <h3>Buyer Info</h3>
                    <p><strong>Name:</strong> {buyer ? formatName(buyer) : 'N/A'}</p>
                    <p><strong>Address:</strong> {buyer ? formatAddress(buyer) : 'N/A'}</p>
                </div>

                <div className="info-card">
                    <h3>Seller Info</h3>
                    <p><strong>Name:</strong> {seller ? formatName(seller) : 'N/A'}</p>
                </div>

                <div className="info-card">
                    <h3>Order Summary</h3>
                    <p><strong>Quantity:</strong> {order.quantity}</p>
                    <p><strong>Mail Text:</strong> {order.mailTxtSaved}</p>
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;
