import { useEffect, useState } from "react";
import "./Landing.css";
import { getProducts } from "../services/addProduct";
import PieChart from "../components/PieChart";
import SalesOverviewChart from "../components/SalesOverviewChart";
import InventoryOverviewCard from "../components/InventoryOverviewCard";

function Landing() {
  const [isLoading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [todayGoldPrice, setTodayGoldPrice] = useState(
    localStorage.getItem('todayGoldPrice') || ''
  );
  const [makingChargePerGram, setMakingChargePerGram] = useState(
    localStorage.getItem('makingChargePerGram') || ''
  );
  const [metalPrices, setMetalPrices] = useState({
    gold22k_10g: null,
    gold24k: null,
    silver: null,
    loading: true,
    error: null
  });

  const onFetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  // Fetch live metal prices
  const fetchMetalPrices = async () => {
    try {
      // Using GoldAPI - you can sign up at https://www.goldapi.io/
      // For now using demo data - replace with actual API call
      
      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock prices - replace with actual API call
      const gold24kPerGram = 7250; // ₹7250 per gram for 24K
      const gold22kPerGram = gold24kPerGram * (22/24); // 22K calculation
      const silverPerGram = 92; // ₹92 per gram
      
      setMetalPrices({
        gold22k_10g: (gold22kPerGram * 10).toFixed(2),
        gold24k: gold24kPerGram.toFixed(2),
        silver: silverPerGram.toFixed(2),
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to fetch metal prices:', error);
      setMetalPrices(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to fetch live prices'
      }));
    }
  };

  useEffect(() => {
    onFetchProducts();
    fetchMetalPrices();
  }, []);

  // Save to localStorage whenever values change
  const handleGoldPriceChange = (e) => {
    const value = e.target.value;
    setTodayGoldPrice(value);
    localStorage.setItem('todayGoldPrice', value);
  };

  const handleMakingChargeChange = (e) => {
    const value = e.target.value;
    setMakingChargePerGram(value);
    localStorage.setItem('makingChargePerGram', value);
  };

  // derived stats
  const totalProducts = products.length;
  const totalWeight = products.reduce((s, p) => s + Number(p.gram || 0), 0);
  const categories = Array.from(new Set(products.map(p => p.category || "Uncategorized")));

  return (
    <div className="landing">
      <h1>Welcome to the Jewelry Shop</h1>
      <p>Manage products, inventory, and billing — all in one place.</p>

      <div className="overview">
        <div className="stats">
          <div className="stat-card">
            <div className="stat-value">{totalProducts}</div>
            <div className="stat-label">Total items</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalWeight.toFixed(2)} g</div>
            <div className="stat-label">Total weight</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{categories.length}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>

        {/* Live Market Prices */}
        <div style={{ margin: '24px auto 32px', maxWidth: 980 }}>
          <h3 style={{ marginBottom: 16, textAlign: 'center' }}>Live Market Prices</h3>
          {metalPrices.loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text)' }}>Loading live prices...</p>
          ) : metalPrices.error ? (
            <p style={{ textAlign: 'center', color: '#d9534f' }}>{metalPrices.error}</p>
          ) : (
            <div className="stats">
              <div className="stat-card" style={{ 
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                color: '#1a1a1a',
                minWidth: 200
              }}>
                <div className="stat-value" style={{ color: '#1a1a1a' }}>₹{metalPrices.gold22k_10g}</div>
                <div className="stat-label" style={{ color: '#333' }}>22K Gold (10 gram)</div>
              </div>
              <div className="stat-card" style={{ 
                background: 'linear-gradient(135deg, #FFD700 0%, #FFED4E 100%)',
                color: '#1a1a1a',
                minWidth: 200
              }}>
                <div className="stat-value" style={{ color: '#1a1a1a' }}>₹{metalPrices.gold24k}</div>
                <div className="stat-label" style={{ color: '#333' }}>24K Gold (per gram)</div>
              </div>
              <div className="stat-card" style={{ 
                background: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)',
                color: '#1a1a1a',
                minWidth: 200
              }}>
                <div className="stat-value" style={{ color: '#1a1a1a' }}>₹{metalPrices.silver}</div>
                <div className="stat-label" style={{ color: '#333' }}>Silver (per gram)</div>
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 }}>
            * Prices are indicative. Please verify current rates before transactions.
          </p>
        </div>

        {/* Today's rates section */}
        <div style={{ 
          maxWidth: 600, 
          margin: '24px auto', 
          padding: '20px', 
          background: 'rgba(30, 35, 45, 0.95)', 
          borderRadius: 10, 
          boxShadow: '0 6px 20px rgba(0,0,0,0.06)' 
        }}>
          <h3 style={{ marginBottom: 16, marginTop: 0 }}>Today's Rates</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
                Today Gold Price (₹ per gram)
              </label>
              <input
                type="number"
                value={todayGoldPrice}
                onChange={handleGoldPriceChange}
                placeholder="Enter today's gold price"
                style={{
                  width: '98%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
                Making Charge per Gram (₹)
              </label>
              <input
                type="number"
                value={makingChargePerGram}
                onChange={handleMakingChargeChange}
                placeholder="Enter making charge per gram"
                style={{
                  width: '98%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 16
                }}
              />
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#666', marginTop: 12, marginBottom: 0 }}>
            These values will automatically populate in the Billing section
          </p>
        </div>

        <div className="charts">
          <h3 style={{ marginBottom: 12 }}>Inventory overview</h3>
          {!isLoading && products && products.length > 0 ? (
            (() => {
              // group by category
              const byCat = {};
              products.forEach((p) => {
                const cat = p.category || "Uncategorized";
                byCat[cat] = byCat[cat] || { count: 0, weight: 0 };
                byCat[cat].count += 1;
                byCat[cat].weight += Number(p.gram || 0);
              });
              const qtyData = Object.keys(byCat).map((k) => ({ label: k, value: byCat[k].count }));
              const weightData = Object.keys(byCat).map((k) => ({ label: k, value: parseFloat(byCat[k].weight.toFixed(2)) }));
              return (
                <div className="charts-row">
                  <div className="chart-wrap">
                    <h4>Quantity by category</h4>
                    <PieChart data={qtyData} size={220} innerRadius={48} />
                  </div>
                  <div className="chart-wrap">
                    <h4>Weight (gm) by category</h4>
                    <PieChart data={weightData} size={220} innerRadius={48} />
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="muted">{isLoading ? "Loading overview..." : "No products to show yet"}</p>
          )}
        </div>

        {/* Sales Overview and Inventory Overview Cards */}
        <div style={{ marginTop: 24 }}>
          <SalesOverviewChart />
        </div>

        <div style={{ marginTop: 24 }}>
          <InventoryOverviewCard />
        </div>
      </div>
    </div>
  );
}

export default Landing;
