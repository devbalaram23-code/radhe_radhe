import { useEffect, useState } from "react";
import axios from "axios";
import "./Inventory.css";

function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dates, setDates] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editedProduct, setEditedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleterName, setDeleterName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

  // pagination derived values
  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedStart = (currentPage - 1) * pageSize;
  const pagedEnd = pagedStart + pageSize;
  const pageItems = products.slice(pagedStart, pagedEnd);

  const baseColumnCount = 10; // Select, Product Code, Category, Created, In Stock, Weight, Price, Carat, Barcode, Actions
  const colCount = baseColumnCount + (showDeleted ? 1 : 0);

  // Clamp current page if products or pageSize change
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, pageSize]);

  useEffect(() => {
    // initial load: fetch all products and populate filter options
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter((x) => x !== id);
    });
  };

  const handleExportExcel = async () => {
    if (!selectedIds.length) {
      alert('Select at least one product to export.');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/api/products/export`, { productIds: selectedIds }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'products.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // fetch products with optional filters
  async function fetchProducts(category = categoryFilter, createdDate = dateFilter, onlyDeletedOverride = null) {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (category) params.category = category;
      if (createdDate) params.createdDate = createdDate;
      const onlyDeleted = onlyDeletedOverride !== null ? onlyDeletedOverride : showDeleted;
      if (onlyDeleted) {
        // request only deleted items when checkbox is checked
        params.onlyDeleted = true;
      }
      const res = await axios.get(`${API_BASE}/api/products`, { params });
      const data = Array.isArray(res.data) ? res.data : [];
      
      // Only display items that are in stock (unless showing sold/unavailable items)
      const filteredData = onlyDeleted 
        ? data 
        : data.filter(p => p.inStock === true);
      
      setProducts(filteredData);

      // populate filter options from the full dataset (if no filters applied)
      if (!category && !createdDate) {
        const cats = Array.from(new Set(filteredData.filter(Boolean).map(p => p.category).filter(Boolean))).sort();
        setCategories(cats);
        const ds = Array.from(new Set(filteredData.map(p => {
          if (!p.createdDate) return null;
          return p.createdDate.split('T')[0];
        }).filter(Boolean))).sort().reverse();
        setDates(ds);
        try { localStorage.setItem("products", JSON.stringify(filteredData)); } catch (e) { /* ignore */ }
      }
        // reset pagination to first page when filter results change
        setCurrentPage(1);
    } catch (err) {
        const cached = JSON.parse(localStorage.getItem("products") || "[]");
        if (cached && cached.length) {
          // Only show in-stock items from cached products
          const filteredCached = showDeleted 
            ? cached 
            : cached.filter(p => p.inStock === true);
          setProducts(filteredCached);
          // don't show a blocking error if we have cached products; just log a warning
          console.warn('Products fetch failed, using cached products:', err.message || err);
        } else {
          // only show error message if we have no cached data to display
          setError(err.message || "Failed to fetch products");
        }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inventory-container page-inventory">
      <div className="inventory-header">
          <h2>Inventory</h2>
          <div style={{ color: '#666', fontSize: 14 }}>{products.length} product(s)</div>
        </div>

      <div className="inventory-filters" style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 14, color: '#333' }}>Category:</label>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); fetchProducts(e.target.value, dateFilter); }}>
          <option value="">All</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={{ fontSize: 14, color: '#333' }}>Created Date:</label>
        <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); fetchProducts(categoryFilter, e.target.value); }}>
          <option value="">All</option>
          {dates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showDeleted} onChange={(e) => { const checked = e.target.checked; setShowDeleted(checked); fetchProducts(categoryFilter, dateFilter, checked); }} />
          <span style={{ fontSize: 14, color: '#333' }}>Show sold/unavailable items</span>
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: '#666' }}>{products.length} product(s)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 14, color: '#333' }}>Page size:</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleExportExcel} disabled={!selectedIds.length}>Export selected to Excel</button>
        </div>
      </div>

      {loading && <p>Loading products...</p>}
      {error && (
        <p style={{ color: "red" }}>Error fetching products: {error}</p>
      )}

      <div className="table-responsive">
      <table className="inventory-table">
        <thead>
            <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedIds.length === products.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>Product Code</th>
                <th>Category</th>
                <th>Created</th>
                <th>In Stock</th>
                {showDeleted && <th>Deleted By</th>}
                <th>Weight</th>
                <th>Price</th>
                <th>Carat</th>
                <th>Barcode</th>
                <th>Actions</th>
              </tr>
        </thead>

        <tbody>
            {products.length === 0 && !loading ? (
            <tr>
                <td colSpan={colCount}>No products available</td>
            </tr>
          ) : (
              pageItems.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={(e) => toggleSelectOne(p.id, e.target.checked)}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.productCode ? p.productCode : p.id}</td>
                  <td>
                    {isEditing ? (
                      <input
                        value={editedProduct.category}
                        onChange={(e) => setEditedProduct({ ...editedProduct, category: e.target.value })}
                      />
                    ) : (
                      p.category
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={editedProduct.createdDate || ''} onChange={(e) => setEditedProduct({ ...editedProduct, createdDate: e.target.value })} />
                    ) : (
                      p.createdDate ? p.createdDate.split('T')[0] : '-'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <input type="checkbox" checked={!!editedProduct.inStock} onChange={(e) => setEditedProduct({ ...editedProduct, inStock: e.target.checked })} />
                    ) : (
                      p.inStock ? 'Yes' : 'No'
                    )}
                  </td>
                  {showDeleted && (
                    <td>
                      {p.deletedBy ? p.deletedBy : '-'}
                    </td>
                  )}
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedProduct.gram}
                        onChange={(e) => setEditedProduct({ ...editedProduct, gram: parseFloat(e.target.value || 0) })}
                      />
                    ) : (
                      p.gram
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedProduct.price}
                        onChange={(e) => setEditedProduct({ ...editedProduct, price: parseFloat(e.target.value || 0) })}
                      />
                    ) : (
                      `₹${p.price}`
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedProduct.carat}
                        onChange={(e) => setEditedProduct({ ...editedProduct, carat: parseInt(e.target.value || 0) })}
                      />
                    ) : (
                      p.carat
                    )}
                  </td>
                  <td>
                    {(p.barcodeImageFilename || p.barcodeImage) ? (
                      <img
                        src={`${API_BASE}/api/products/${p.id}/barcode`}
                        alt={`barcode-${p.id}`}
                        style={{ maxWidth: 140, height: 'auto' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : p.barcodeImagePath ? (
                      (() => {
                        const filename = p.barcodeImagePath.split('/').pop();
                        const url = `${API_BASE}/barcodes/${filename}`;
                        return (
                          <img
                            src={url}
                            alt={`barcode-${p.id}`}
                            style={{ maxWidth: 140, height: 'auto' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        );
                      })()
                    ) : (
                      <span>No barcode</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              const res = await axios.put(`${API_BASE}/api/products/${p.id}`, editedProduct);
                              // update local state
                              setProducts(products.map((x) => (x.id === p.id ? res.data : x)));
                              setEditingId(null);
                              setEditedProduct(null);
                            } catch (err) {
                              alert('Failed to save: ' + (err.response?.data?.message || err.message));
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditedProduct(null); }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(p.id); setEditedProduct({ ...p }); }}>Edit</button>
                        <button
                          onClick={() => {
                            // open modal to ask for deleter name
                            setDeleteTarget(p);
                            setDeleterName("");
                            setShowDeleteModal(true);
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
      {/* pagination controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ color: '#555' }}>Page {currentPage} of {totalPages}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Prev</button>
          {/* show simple page buttons */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 20).map(n => (
            <button key={n} onClick={() => setCurrentPage(n)} style={{ fontWeight: n === currentPage ? '700' : '400' }}>{n}</button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</button>
        </div>
      </div>
      {showDeleteModal && deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 420, maxWidth: '95%' }}>
            <h3 style={{ marginTop: 0 }}>Delete Product</h3>
            <p>Enter the name of the person deleting <strong>{deleteTarget.productCode ? deleteTarget.productCode : deleteTarget.id}</strong>:</p>
            <input value={deleterName} onChange={(e) => setDeleterName(e.target.value)} placeholder="Deleted by (name)" style={{ width: '100%', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); setDeleterName(""); }}>Cancel</button>
              <button className="btn" style={{ background: '#d9534f' }} onClick={async () => {
                if (!deleterName || deleterName.trim() === '') { alert('Please enter the name of the person deleting'); return; }
                try {
                  await axios.delete(`${API_BASE}/api/products/${deleteTarget.id}`, { params: { deletedBy: deleterName } });
                  // refresh products respecting current filters
                  fetchProducts(categoryFilter, dateFilter);
                } catch (err) {
                  alert('Failed to delete: ' + (err.response?.data?.message || err.message));
                } finally {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                  setDeleterName("");
                }
              }}>Confirm delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
