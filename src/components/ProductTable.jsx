import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { COLLECTIONS, formatBoolean, formatCurrency, formatDate, normalizeProduct } from '../utils/adminModels';
import { TableLoadingRow } from './LoadingState';

const categoryMap = {
    Shoes: ['All', 'Sneakers', 'Boots', 'Loafers', 'Sandals'],
    Apparel: ['All', 'Outerwear', 'Tops', 'Bottoms', 'Sweatshirts'],
    Accessories: ['All', 'Headwear', 'Eyewear', 'Bags', 'Socks', 'Jewelry', 'Lifestyle']
};

const ProductTable = () => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterSubCategory, setFilterSubCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, COLLECTIONS.products), (snapshot) => {
            const productList = snapshot.docs.map(normalizeProduct);
            const sorted = productList.sort((a, b) => {
                const dateA = a.uploadDate?.toMillis?.() || a.uploadDate?.seconds || 0;
                const dateB = b.uploadDate?.toMillis?.() || b.uploadDate?.seconds || 0;
                return dateB - dateA;
            });

            setProducts(sorted);
            setLoadError('');
            setLoading(false);
        }, (error) => {
            console.error('Error loading products:', error);
            setLoadError('Products could not be loaded. Please refresh and try again.');
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filtered = products.filter((product) => {
        const searchText = `${product.title} ${product.brand} ${product.model} ${product.productStatus}`.toLowerCase();
        const matchesSearch = searchText.includes(search.toLowerCase());
        const matchesType =
            filterType === 'All' ||
            (filterType === 'OneTime' && product.kind === 'One Time') ||
            (filterType === 'Raffle' && product.kind === 'Raffle');
        const matchesCategory = filterCategory === 'All' || product.productType === filterCategory;
        const matchesSubCategory = filterSubCategory === 'All' || product.subCategory === filterSubCategory;

        return matchesSearch && matchesType && matchesCategory && matchesSubCategory;
    });

    const subCategoryOptions =
        filterCategory !== 'All' ? categoryMap[filterCategory] || ['All'] : [];

    return (
        <div className="panel-section">
            <div className="section-header">
                <div>
                    <h2>Products</h2>
                    <p>{filtered.length} of {products.length} products</p>
                </div>
            </div>

            <div className="filters-bar">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="All">All Types</option>
                    <option value="OneTime">One Time Purchase</option>
                    <option value="Raffle">Raffle</option>
                </select>

                <select value={filterCategory} onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setFilterSubCategory('All');
                }}>
                    <option value="All">All Categories</option>
                    {Object.keys(categoryMap).map((category) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>

                {filterCategory !== 'All' && (
                    <select
                        value={filterSubCategory}
                        onChange={(e) => setFilterSubCategory(e.target.value)}
                    >
                        {subCategoryOptions.map((subCategory) => (
                            <option key={subCategory} value={subCategory}>{subCategory}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="table-shell">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Approved</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableLoadingRow colSpan={8} message="Loading products..." detail="Preparing listings and product images." />
                        ) : loadError ? (
                            <tr><td colSpan="8" className="table-error-cell">{loadError}</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="no-data">No products found</td>
                            </tr>
                        ) : (
                            filtered.map((product) => (
                                <tr key={product.id}>
                                    <td>
                                        <div className="entity-cell">
                                            {product.images?.[0] ? (
                                                <img src={product.images[0]} alt={product.title || 'Product'} />
                                            ) : (
                                                <span className="empty-thumb">No image</span>
                                            )}
                                            <div>
                                                <strong>{product.title || 'Untitled product'}</strong>
                                                <span>{product.brand || product.model || product.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="type-pill">{product.kind}</span></td>
                                    <td>{[product.productType, product.subCategory].filter(Boolean).join(' / ') || 'N/A'}</td>
                                    <td>{formatCurrency(product.price)}</td>
                                    <td><span className="status-pill">{product.productStatus || 'N/A'}</span></td>
                                    <td>{formatBoolean(product.isApproved)}</td>
                                    <td>{product.kind === 'Raffle' ? formatDate(product.eventStartDate) : formatDate(product.uploadDate)}</td>
                                    <td>
                                        <Link to={`/product/${product.id}`} className="view-btn">
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

export default ProductTable;
