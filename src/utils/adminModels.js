export const COLLECTIONS = {
    users: 'users',
    products: 'products',
    orders: 'Orders',
    support: 'support_messages'
};

export const getFirstValue = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return '';
};

export const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
    if (typeof value === 'number') return new Date(value > 9999999999 ? value : value * 1000);

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (value, options = {}) => {
    const date = toDate(value);
    if (!date) return 'N/A';

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    });
};

export const formatDateTime = (value) => {
    const date = toDate(value);
    if (!date) return 'N/A';
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

export const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'N/A';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
    }).format(amount);
};

const centsToDollars = (directValue, centsValue) => {
    if (directValue !== undefined && directValue !== null && directValue !== '') return directValue;
    if (centsValue !== undefined && centsValue !== null && centsValue !== '') return Number(centsValue) / 100;
    return '';
};

export const formatBoolean = (value) => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return value || 'N/A';
};

export const formatName = (data = {}) => {
    const directName = getFirstValue(data.name, data.fullName, data.displayName, data.username);
    if (directName) return directName;

    const first = getFirstValue(data.fName, data.firstName, data.first_name);
    const last = getFirstValue(data.lName, data.lastName, data.last_name);
    return `${first} ${last}`.trim() || 'N/A';
};

export const formatAddress = (data = {}) => {
    const address = data.address || data.shipping || data.shippingAddressObject || {};
    const line1 = getFirstValue(data.shippingAddress, data.Address1, data.addressLine1, data.street, address.line1, address.street);
    const line2 = getFirstValue(data.Address2, data.addressLine2, address.line2);
    const city = getFirstValue(data.city, address.city);
    const state = getFirstValue(data.state, data.province, address.state, address.province);
    const zip = getFirstValue(data.zipcode, data.zipCode, data.postalCode, address.zipcode, address.zipCode, address.postalCode);

    return [line1, line2, city, [state, zip].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ') || 'N/A';
};

export const getImages = (data = {}) => {
    const images = getFirstValue(data.images, data.imageUrls, data.photos, data.gallery);
    if (Array.isArray(images)) return images.filter(Boolean);

    return [
        data.image,
        data.imageUrl,
        data.thumbnail,
        data.thumbnailUrl,
        data.coverImage
    ].filter(Boolean);
};

export const normalizeUser = (docSnapOrData) => {
    const raw = typeof docSnapOrData?.data === 'function' ? docSnapOrData.data() : docSnapOrData || {};
    const id = docSnapOrData?.id || raw.id || raw.uid || raw.userId || '';

    return {
        ...raw,
        id,
        displayName: formatName(raw),
        email: getFirstValue(raw.email, raw.emailAddress),
        phone: getFirstValue(raw.phone, raw.phoneNumber, raw.mobile),
        address: formatAddress(raw),
        joinedAt: getFirstValue(raw.createdAt, raw.joinedAt, raw.createdDate),
        grailWallet: getFirstValue(raw.grailWallet, raw.wallet),
        grailCoin: getFirstValue(raw.grailCoin, raw.lifetimePointsEarned),
        sellerStatus: getFirstValue(raw.sellerStatus, raw.stripeConnectStatus),
        signUpProvider: getFirstValue(raw.signUpProvider, 'email')
    };
};

export const getProductKind = (product = {}) => {
    if (product.isOneTimePurchase === true) return 'One Time';
    if (product.isOneTimePurchase === false) return 'Raffle';

    const kind = String(getFirstValue(product.saleType, product.type, product.productKind, product.listingType)).toLowerCase();
    if (kind.includes('raffle')) return 'Raffle';
    if (kind.includes('one') || kind.includes('sale') || kind.includes('purchase')) return 'One Time';

    return 'Product';
};

export const normalizeProduct = (docSnapOrData) => {
    const raw = typeof docSnapOrData?.data === 'function' ? docSnapOrData.data() : docSnapOrData || {};
    const id = docSnapOrData?.id || raw.id || raw.productId || '';

    return {
        ...raw,
        id,
        title: getFirstValue(raw.title, raw.name, raw.model, raw.productName),
        brand: getFirstValue(raw.brand, raw.manufacturer),
        model: getFirstValue(raw.model, raw.title, raw.name),
        price: getFirstValue(raw.price, raw.amount, raw.salePrice, raw.retailPrice),
        productStatus: getFirstValue(raw.productStatus, raw.status, raw.approvalStatus),
        isApproved: getFirstValue(raw.isApproved, raw.approved),
        productType: getFirstValue(raw.productType, raw.category, raw.mainCategory),
        subCategory: getFirstValue(raw.subCategory, raw.subcategory, raw.categoryType),
        uploadDate: getFirstValue(raw.uploadDate, raw.createdAt, raw.createdDate),
        eventStartDate: getFirstValue(raw.eventStartDate, raw.startDate, raw.raffleStartDate),
        eventEndDate: getFirstValue(raw.postTime, raw.eventEndDate, raw.endDate, raw.raffleEndDate),
        sellerId: getFirstValue(raw.userId, raw.sellerId, raw.ownerId, raw.createdBy),
        trackingIDOfProduct: getFirstValue(raw.trackingIDOfProduct, raw.trackingId, raw.trackingNumber),
        estimatedShippingCost: getFirstValue(raw.estimatedShippingCost),
        shippingHoldAmount: getFirstValue(raw.shippingHoldAmount),
        shippingCost: getFirstValue(raw.shippingCost),
        freeDeliveryBySeller: getFirstValue(raw.freeDeliveryBySeller, raw.isFreeDelivery, raw.freeDelivery),
        freeDeliveryByHG: getFirstValue(raw.freeDeliveryByHG, raw.hgFreeShipping, raw.freeShippingByHG),
        kind: getProductKind(raw),
        images: getImages(raw)
    };
};

export const normalizeVariation = (docSnapOrData) => {
    const raw = typeof docSnapOrData?.data === 'function' ? docSnapOrData.data() : docSnapOrData || {};

    return {
        ...raw,
        id: docSnapOrData?.id || raw.id || raw.variantId || raw.variationId || '',
        size: getFirstValue(raw.size, raw.shoeSize, raw.variantSize),
        brand: getFirstValue(raw.brand),
        model: getFirstValue(raw.model, raw.name, raw.title),
        condition: getFirstValue(raw.condition),
        ogbox: getFirstValue(raw.ogbox, raw.ogBox, raw.originalBox, raw.hasOriginalBox),
        receipt: getFirstValue(raw.receipt, raw.hasReceipt),
        price: getFirstValue(raw.price, raw.amount),
        quantity: getFirstValue(raw.quantity, raw.stock, raw.qty)
    };
};

export const normalizeOrder = (docSnapOrData) => {
    const raw = typeof docSnapOrData?.data === 'function' ? docSnapOrData.data() : docSnapOrData || {};
    const id = docSnapOrData?.id || raw.id || raw.orderId || '';

    return {
        ...raw,
        id,
        orderId: getFirstValue(raw.orderId, id),
        productId: getFirstValue(raw.productId, raw.productID),
        variantId: getFirstValue(raw.variantId, raw.variationId, raw.sizeId),
        buyerId: getFirstValue(raw.purchasedBy, raw.buyerId, raw.customerId, raw.userId),
        sellerId: getFirstValue(raw.sellerId, raw.ownerId),
        orderStatus: getFirstValue(raw.orderStatus, raw.status, 'Pending'),
        orderDate: getFirstValue(raw.orderDate, raw.createdAt, raw.createdDate),
        updatedAt: getFirstValue(raw.updatedAt, raw.marketplaceUpdatedAt),
        paymentMethod: getFirstValue(raw.paymentMethod, raw.paymentType),
        paidByBuyer: centsToDollars(getFirstValue(raw.paidByBuyer, raw.totalAmount, raw.total, raw.amount), raw.paidByBuyerCents),
        sellerMade: centsToDollars(getFirstValue(raw.sellerMade, raw.sellerPayout, raw.payout), raw.sellerMadeCents),
        shippingCost: centsToDollars(raw.shippingCost, raw.shippingCostCents),
        shippingTag: getFirstValue(raw.shippingTag, raw.tracking, raw.trackingId, raw.trackingNumber),
        trackingNumber: getFirstValue(raw.trackingNumber, raw.shippingTag, raw.tracking),
        shippingProvider: getFirstValue(raw.shippingProvider),
        shippingServiceLevel: getFirstValue(raw.shippingServiceLevel),
        shippingLabelId: getFirstValue(raw.shippingLabelId),
        marketplacePaymentId: getFirstValue(raw.marketplacePaymentId),
        stripePaymentIntentId: getFirstValue(raw.stripePaymentIntentId),
        sellerPayoutStatus: getFirstValue(raw.sellerPayoutStatus),
        fundsReleasedAt: getFirstValue(raw.fundsReleasedAt),
        quantity: getFirstValue(raw.quantity, raw.qty, 1)
    };
};

export const normalizeSupportTicket = (docSnapOrData) => {
    const raw = typeof docSnapOrData?.data === 'function' ? docSnapOrData.data() : docSnapOrData || {};

    return {
        ...raw,
        id: docSnapOrData?.id || raw.id || '',
        name: getFirstValue(raw.name, formatName(raw)),
        email: getFirstValue(raw.email, raw.emailAddress),
        category: getFirstValue(raw.category, raw.reason, raw.subject, 'General'),
        message: getFirstValue(raw.message, raw.description, raw.body),
        status: getFirstValue(raw.status, 'Pending'),
        createdAt: getFirstValue(raw.createdAt, raw.createdDate, raw.sentAt)
    };
};
