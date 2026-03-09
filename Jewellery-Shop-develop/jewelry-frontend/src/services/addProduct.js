import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

export const addProduct = async (productData) => {
  try {
    const res = await axios.post(
      `${API_BASE}/api/products`,
      productData
    );
    console.log("Product added successfully:", res);
    // update local cache so UI can show the new product immediately if inventory fetch fails briefly
    try {
      const existing = JSON.parse(localStorage.getItem('products') || '[]');
      if (res.data) {
        existing.unshift(res.data);
        localStorage.setItem('products', JSON.stringify(existing));
      }
    } catch (e) {
      // ignore localStorage failures
    }
    return res.data;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

export const getProducts = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/products`);
    return res.data;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};
