import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddProduct.css";
import { addProduct } from "../services/addProduct";
import { toast, Toaster } from 'sonner';
import { useThemeMode } from '../ThemeContext';

function AddProduct() {
  const [form, setForm] = useState({
    category: "",
    gram: "",
    carat: "22-916", // default to 22K (916)
    perGramPrice: "",
    price: "",
  });

  useEffect(() => {
    const savedPerGramPrice = localStorage.getItem('addProductPerGramPrice') || '';
    if (savedPerGramPrice) {
      setForm(prev => ({ ...prev, perGramPrice: savedPerGramPrice }));
    }
  }, []);

  const { isDark: darkMode } = useThemeMode();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'carat') {
      setForm({ ...form, [name]: value });
      return;
    }
    const next = { ...form, [name]: value };
    if (name === 'perGramPrice') {
      localStorage.setItem('addProductPerGramPrice', value);
    }

    if (name === 'gram' || name === 'perGramPrice') {
      const gramVal = parseFloat(next.gram);
      const perGramVal = parseFloat(next.perGramPrice);
      if (!Number.isNaN(gramVal) && !Number.isNaN(perGramVal)) {
        next.price = (gramVal * perGramVal).toFixed(2);
      } else {
        next.price = '';
      }
    }
    setForm(next);
  };

  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const validate = () => {
    if (!form.category || form.category.trim() === "") return "Please select a category";
    if (!form.gram || isNaN(Number(form.gram))) return "Please provide a valid weight in grams";
    if (!form.carat) return "Please provide carat";
    if (!form.perGramPrice || isNaN(Number(form.perGramPrice))) return "Please provide per gram price";
    if (!form.price || isNaN(Number(form.price))) return "Please provide price";
    return null;
  };

  const onSaveClick = () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setShowConfirm(true);
  };

  const onConfirm = async () => {
    setSaving(true);
    try {
      // Convert carat: "22-916" -> 22, others parse as number
      const caratValue = form.carat === "22-916" ? 22 : Number(form.carat);
      await addProduct({
        category: form.category,
        gram: Number(form.gram),
        carat: caratValue,
        perGramPrice: Number(form.perGramPrice),
        price: Number(form.price),
      });
      setShowConfirm(false);
      toast.success('Product added successfully!');
      // Delay navigation to allow toast to be visible
      setTimeout(() => {
        navigate(-1);
      }, 1000);
    } catch (err) {
      setFormError('Failed to add product: ' + (err.message || 'unknown'));
      toast.error('Failed to add product: ' + (err.message || 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  const onCancelConfirm = () => {
    setShowConfirm(false);
    navigate(-1);
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="full-screen page-addproduct">
      <div className="form-box">
        <h2>Add Product</h2>

        {/* removed product name input as requested */}

        {/* DROPDOWN CATEGORY */}
        <select name="category" value={form.category} onChange={handleChange} className="dropdown">
          <option value="">Select Category</option>
          <option value="Rani Hara">Rani Hara</option>
          <option value="Necklace">Necklace</option>
          <option value="Dokia Chain">Dokia Chain</option>
          <option value="Chain">Chain</option>
          <option value="Managala Sutra">Managala Sutra</option>
          <option value="Sankhi">Sankhi</option>
          <option value="Chud Sankhi">Chud Sankhi</option>
          <option value="Oval Sankhi">Oval Sankhi</option>
          <option value="Flat Sankhi">Flat Sankhi</option>
          <option value="Chud">Chud</option>
          <option value="Bala">Bala</option>
          <option value="Bracelet">Bracelet</option>
          <option value="LRing">LRing</option>
          <option value="GRing">GRing</option>
          <option value="Earing">Earing</option>
          <option value="Tops">Tops</option>
          <option value="Pendi Phula">Pendi Phula</option>
          <option value="Other">Other</option>
        </select>

        <input
          name="gram"
          placeholder="Weight (grams)"
          type="number"
          value={form.gram}
          onChange={handleChange}
          style={{ width: '97%' }}
        />

        <input
          name="perGramPrice"
          placeholder="Per gram price (₹)"
          type="number"
          value={form.perGramPrice}
          onChange={handleChange}
          style={{ width: '97%' }}
        />

        <label style={{ display: 'block', marginTop: 8, color: darkMode ? '#ccc' : '#666' }}>Carat</label>
        <select name="carat" value={form.carat} onChange={handleChange} className="dropdown">
          <option value={24}>24K</option>
          <option value="22-916">22K (916)</option>
          <option value={22}>22K</option>
          <option value={18}>18K</option>
        </select>

        <input name="price" placeholder="Price" type="number" value={form.price} onChange={handleChange} style={{ width: '97%' }} readOnly />

        {formError && <div style={{ color: '#f44336', marginBottom: 8, fontWeight: 'bold' }}>{formError}</div>}

        <button onClick={onSaveClick} className="btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>

        {showConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: darkMode ? '#1e232d' : 'white', padding: 20, borderRadius: 8, width: 420, maxWidth: '90%' }}>
              <h3 style={{ marginTop: 0, color: darkMode ? '#fff' : '#333' }}>Confirm Add Product</h3>
              <p style={{ color: darkMode ? '#ccc' : '#555' }}>Are you sure you want to add this product to inventory?</p>
              <ul style={{ color: darkMode ? '#ccc' : '#555' }}>
                <li>Category: <strong>{form.category}</strong></li>
                <li>Weight: <strong>{form.gram} gm</strong></li>
                <li>Carat: <strong>{form.carat === "22-916" ? "22K (916)" : `${form.carat}K`}</strong></li>
                <li>Per gram price: <strong>₹{form.perGramPrice}</strong></li>
                <li>Price: <strong>₹{form.price}</strong></li>
              </ul>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn" style={{ background: '#6c757d' }} onClick={onCancelConfirm} disabled={saving}>Cancel</button>
                <button className="btn" style={{ background: '#198754' }} onClick={onConfirm} disabled={saving}>{saving ? 'Saving...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
    </>
  );
}

export default AddProduct;
