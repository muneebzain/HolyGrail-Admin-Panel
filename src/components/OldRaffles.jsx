import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const categoryMap = {
    Shoes: ["All", "Sneakers", "Boots", "Loafers", "Sandals"],
    Apparel: ["All", "Outerwear", "Tops", "Bottoms", "Sweatshirts"],
    Accessories: ["All", "Headwear", "Eyewear", "Bags", "Socks", "Jewelry", "Lifestyle"]
};

const OldProductTable = () => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterSubCategory, setFilterSubCategory] = useState('All');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'reffels'), (snapshot) => {
            const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productList);
        });

        return () => unsubscribe(); // cleanup listener on unmount
    }, []);

    const filtered = products.filter(p => {
        return p;
    });

    const subCategoryOptions = filterCategory !== 'All' ? categoryMap[filterCategory] || ["All"] : [];

    return (
        <div>
            <h2>Products</h2>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {filterCategory !== 'All' && (
                    <select value={filterSubCategory} onChange={(e) => setFilterSubCategory(e.target.value)}>
                        {subCategoryOptions.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Table */}
            <table>
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Brand</th>
                        <th>Spot Price</th>
                        <th>Total Spots</th>
                        <th>Total Taken</th>
                        <th>Description</th>
                        <th>Image</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length === 0 ? (
                        <tr><td colSpan="4" className="no-data">No products found</td></tr>
                    ) : (
                        filtered.map(product => (
                            <tr key={product.id}>
                                <td>{product.model}</td>
                                <td>{product.brand}</td>
                                <td>${product.price}</td>
                                <td>{product.spot}</td>
                                <td>{product.spotCount.length}</td>
                                <td>{product.description}</td>
                                <td>
                                    {product.images?.[0] ? (
                                        <img src={product.images[0]} alt="thumb" width="60" />
                                    ) : 'No Image'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default OldProductTable;
