import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import PriceCalculator from '../components/PriceCalculator';
import './Home.css';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const Home = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayGoldPrice, setTodayGoldPrice] = useState(
    localStorage.getItem('todayGoldPrice') || ''
  );
  const [makingChargePerGram, setMakingChargePerGram] = useState(
    localStorage.getItem('makingChargePerGram') || ''
  );
  const [recentSlide, setRecentSlide] = useState(0);
  const [bestSlide, setBestSlide] = useState(0);

  // Market prices (you can make these dynamic by fetching from an API)
  // eslint-disable-next-line no-unused-vars
  const goldRate = 6458.9;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, billsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/products`),
        axios.get(`${API_BASE}/api/bills`)
      ]);
      setProducts(productsRes.data || []);
      setBills(billsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

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

  // Calculate inventory stats
  // eslint-disable-next-line no-unused-vars
  const categoryCount = [...new Set(products.map(p => p.category))].length;

  // Inventory Quantity by Category
  const inventoryByCategory = products.reduce((acc, product) => {
    const category = product.category || 'Others';
    if (!acc[category]) {
      acc[category] = { count: 0, weight: 0 };
    }
    acc[category].count += 1;
    acc[category].weight += product.gram || 0;
    return acc;
  }, {});

  const inventoryPieData = Object.entries(inventoryByCategory).map(([name, data]) => ({
    name,
    value: data.count
  }));

  const inventoryWeightPieData = Object.entries(inventoryByCategory).map(([name, data]) => ({
    name: `${name} ${data.weight.toFixed(1)}g`,
    value: parseFloat(data.weight.toFixed(1))
  }));

  // Weekly Sales
  const getWeeklySales = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate >= sevenDaysAgo && billDate <= now;
    });

    const totalSales = weeklyBills.reduce((sum, bill) => sum + (bill.grandTotal || 0), 0);
    
    // Generate daily data for bar chart with proper date formatting
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Jan 17" format
      const daySales = weeklyBills
        .filter(bill => {
          const billDate = new Date(bill.createdAt);
          return billDate.toDateString() === date.toDateString();
        })
        .reduce((sum, bill) => sum + (bill.grandTotal || 0), 0);
      
      // Use 0.01 as minimum for log scale (can't display 0 on log scale)
      dailyData.push({ day: dateStr, sales: daySales || 0.01 });
    }

    return { totalSales, dailyData, billCount: weeklyBills.length };
  };

  const weeklySales = getWeeklySales();

  // Monthly Sales
  const getMonthlySales = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const monthlyBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate.getFullYear() === currentYear;
    });

    const totalSales = monthlyBills.reduce((sum, bill) => sum + (bill.grandTotal || 0), 0);
    
    // Generate monthly data for all 12 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthNames.map((month, idx) => {
      const monthSales = monthlyBills
        .filter(bill => {
          const billDate = new Date(bill.createdAt);
          return billDate.getMonth() === idx;
        })
        .reduce((sum, bill) => sum + (bill.grandTotal || 0), 0);
      
      // Use 0.01 as minimum for log scale (can't display 0 on log scale)
      return { month, sales: monthSales || 0.01 };
    });

    return { totalSales, monthlyData, billCount: monthlyBills.length };
  };

  const monthlySales = getMonthlySales();

  // Current month sales and stock stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthSales = bills
    .filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
    })
    .reduce((sum, bill) => sum + (bill.grandTotal || 0), 0);

  const totalGoldWeight = products
    .filter(p => p.isAvailable !== false && p.inStock !== false)
    .reduce((sum, p) => sum + (p.gram || 0), 0);

  const recentSales = [...bills]
    .filter(b => b.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  // eslint-disable-next-line no-unused-vars
  const recentPurchase = recentSales[0];

  const cardPalette = {
    sales: {
      bg: isDark ? 'rgba(245, 124, 0, 0.12)' : '#FFF9E6',
      border: isDark ? '1px solid rgba(245, 124, 0, 0.35)' : '1px solid #FFE082',
      text: isDark ? '#ffb74d' : '#F57C00'
    },
    weight: {
      bg: isDark ? 'rgba(46, 125, 50, 0.12)' : '#E8F5E9',
      border: isDark ? '1px solid rgba(46, 125, 50, 0.35)' : '1px solid #A5D6A7',
      text: isDark ? '#81c784' : '#2e7d32'
    },
    recent: {
      bg: isDark ? 'rgba(21, 101, 192, 0.12)' : '#E3F2FD',
      border: isDark ? '1px solid rgba(21, 101, 192, 0.35)' : '1px solid #90CAF9',
      text: isDark ? '#90caf9' : '#1565c0'
    },
    weekly: {
      bg: isDark ? 'rgba(83, 109, 254, 0.12)' : '#E8EAF6',
      border: isDark ? '1px solid rgba(83, 109, 254, 0.35)' : '1px solid #C5CAE9',
      text: isDark ? '#9fa8da' : '#3f51b5'
    },
    progressTrack: isDark ? '#2c3c52' : '#E0E0E0'
  };

  const statCardBase = {
    height: '100%',
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  };

  // Best Selling Categories
  const bestSellingCategories = () => {
    const categoryStats = {};
    
    bills.forEach(bill => {
      if (bill.billItems && Array.isArray(bill.billItems)) {
        bill.billItems.forEach(item => {
          if (item.hsnCode === 'OLD') return;
          
          const category = item.itemDescription?.split(' - ')[0]?.trim() || 'Others';
          
          if (!categoryStats[category]) {
            categoryStats[category] = { count: 0, weight: 0, percentage: 0 };
          }
          categoryStats[category].count += 1;
          categoryStats[category].weight += item.netGoldWeight || 0;
        });
      }
    });

    const totalItems = Object.values(categoryStats).reduce((sum, cat) => sum + cat.count, 0);
    const maxCount = Math.max(...Object.values(categoryStats).map(cat => cat.count), 1);
    
    return Object.entries(categoryStats)
      .map(([category, data]) => ({
        category,
        items: data.count,
        weight: data.weight.toFixed(2),
        percentage: totalItems > 0 ? ((data.count / maxCount) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.items - a.items)
      .slice(0, 5);
  };

  const bestSelling = bestSellingCategories();
  const bestTop = bestSelling.slice(0, 2);

  // Low Stock Alert
  const lowStockItems = products
    .filter(p => !p.isAvailable || !p.inStock)
    .slice(0, 4)
    .map(p => ({
      category: p.category || 'Uncategorized',
      quantity: 0,
      threshold: 650
    }));

  // Auto-rotate recent sold and top best products
  useEffect(() => {
    if (recentSales.length <= 1) return undefined;
    const id = setInterval(() => {
      setRecentSlide((idx) => (idx + 1) % recentSales.length);
    }, 3500);
    return () => clearInterval(id);
  }, [recentSales.length]);

  useEffect(() => {
    if (bestTop.length <= 1) return undefined;
    const id = setInterval(() => {
      setBestSlide((idx) => (idx + 1) % bestTop.length);
    }, 4000);
    return () => clearInterval(id);
  }, [bestTop.length]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Typography variant="h5">Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box className="home-container">
      {/* Key Stats */}
      <Paper className="market-prices-section" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Key Stats</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card sx={{ ...statCardBase, bgcolor: cardPalette.sales.bg, border: cardPalette.sales.border }}>
              <CardContent>
                <Typography variant="body2" sx={{ mb: 1 }}>Monthly Sales</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: cardPalette.sales.text }}>
                  ₹{currentMonthSales.toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Current month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ ...statCardBase, bgcolor: cardPalette.weight.bg, border: cardPalette.weight.border }}>
              <CardContent>
                <Typography variant="body2" sx={{ mb: 1 }}>Total Gold Weight</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: cardPalette.weight.text }}>
                  {totalGoldWeight.toFixed(2)}g
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  In stock
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ ...statCardBase, bgcolor: cardPalette.weekly.bg, border: cardPalette.weekly.border }}>
              <CardContent>
                <Typography variant="body2" sx={{ mb: 1 }}>Weekly Sales (7d)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: cardPalette.weekly.text }}>
                  ₹{weeklySales.totalSales.toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Orders: {weeklySales.billCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ ...statCardBase, bgcolor: cardPalette.recent.bg, border: cardPalette.recent.border }}>
              <CardContent sx={{ overflow: 'hidden', position: 'relative', height: '100%' }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Recently Sold & Top Sellers</Typography>
                <Box sx={{ height: 70, overflow: 'hidden', position: 'relative' }}>
                  {recentSales.length === 0 ? (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>No data</Typography>
                  ) : (
                    <Box
                      key={recentSlide}
                      className="scroll-item"
                      sx={{ position: 'absolute', width: '100%' }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: cardPalette.recent.text }}>
                        ₹{(recentSales[recentSlide].grandTotal || 0).toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {recentSales[recentSlide].customerName || '---'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                        {recentSales[recentSlide].billItems && recentSales[recentSlide].billItems.length > 0
                          ? recentSales[recentSlide].billItems.map(item => item.itemDescription?.split(' - ')[0] || 'Item').join(', ')
                          : 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                        {recentSales[recentSlide].createdAt ? new Date(recentSales[recentSlide].createdAt).toLocaleDateString('en-IN') : ''}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>🏆 Top Products:</Typography>
                  {bestTop.length === 0 ? (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>No data</Typography>
                  ) : (
                    bestTop.map((item, idx) => (
                      <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary' }}>
                        {idx + 1}. {item.category} - {item.items} sold
                      </Typography>
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Price Calculator */}
      <PriceCalculator />

      {/* Billing Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Billing Settings <Typography component="span" variant="caption">(Applied to all bills today)</Typography>
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Gold Rate ₹{todayGoldPrice || '6,640'}
              </Typography>
              <input
                type="number"
                value={todayGoldPrice}
                onChange={handleGoldPriceChange}
                placeholder="Enter today's gold price"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Auto-applied during billing
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Making Charge ₹{makingChargePerGram || '1,000'}
              </Typography>
              <input
                type="number"
                value={makingChargePerGram}
                onChange={handleMakingChargeChange}
                placeholder="Enter making charge per gram"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Auto-applied during billing
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Two Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={6}>
          {/* Weekly Sales */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Weekly Sales <Typography component="span" variant="caption">(Last 7 Days)</Typography>
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
              ₹{weeklySales.totalSales.toLocaleString('en-IN')}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklySales.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis 
                  scale="log" 
                  domain={[1, 'auto']}
                  tick={{ fontSize: 12 }} 
                  label={{ value: 'Sales', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value) => {
                    if (value <= 0.01) return '₹0';
                    return `₹${value.toLocaleString('en-IN')}`;
                  }} 
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={() => 'Sales Amount'}
                />
                <Bar dataKey="sales" fill="#D4AF37" name="Sales Amount" />
              </BarChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Average</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  ₹{weeklySales.billCount > 0 ? (weeklySales.totalSales / 7).toFixed(2) : 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Orders</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{weeklySales.billCount}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Best Selling Categories */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
              🏆 Best-Selling Categories
            </Typography>
            {bestTop.length > 0 && (
              <Box sx={{
                mb: 2,
                p: 1.5,
                border: `1px dashed ${cardPalette.progressTrack}`,
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2
              }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Spotlight: {bestTop[bestSlide].category}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {bestTop[bestSlide].items} sales • {bestTop[bestSlide].weight}g
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {bestSlide + 1} / {bestTop.length}
                </Typography>
              </Box>
            )}
            {bestSelling.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                No sales data available
              </Typography>
            ) : (
              bestSelling.map((item, idx) => (
                <Box key={idx} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {idx + 1}. {item.category}
                    </Typography>
                    <Box sx={{ 
                      bgcolor: isDark ? '#2f3b4f' : '#4a5568', 
                      color: isDark ? '#f5d77a' : '#d4af37',
                      px: 2, 
                      py: 0.5, 
                      borderRadius: 1,
                      fontWeight: 'bold',
                      minWidth: '50px',
                      textAlign: 'center'
                    }}>
                      #{idx + 1}
                    </Box>
                  </Box>
                  
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                    {item.items} times sold • {item.weight}g total
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      flex: 1, 
                      height: 12, 
                      bgcolor: cardPalette.progressTrack, 
                      borderRadius: 4, 
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ 
                        width: `${item.percentage}%`, 
                        height: '100%', 
                        bgcolor: '#D4AF37',
                        borderRadius: 4,
                        transition: 'width 0.3s ease'
                      }} />
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={6}>
          {/* Inventory Quantity by Category */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Inventory Quantity by Category</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={inventoryPieData} cx="50%" cy="50%" outerRadius={60} fill="#8884d8" dataKey="value" label isAnimationActive={false}>
                      {inventoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                  By Item Count
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={inventoryWeightPieData} cx="50%" cy="50%" outerRadius={60} fill="#82ca9d" dataKey="value" label isAnimationActive={false}>
                      {inventoryWeightPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                  By Weight (grams)
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Monthly Sales */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              🗓️ Monthly Sales <Typography component="span" variant="caption">(This Year)</Typography>
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 2,
              mb: 3,
              alignItems: 'stretch'
            }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Total Sales</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#d4af37', mt: 0.5 }}>
                  ₹{monthlySales.totalSales.toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Average</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4caf50', mt: 0.5 }}>
                  ₹{(monthlySales.totalSales / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.3)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Highest</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2196f3', mt: 0.5 }}>
                  ₹{Math.max(...monthlySales.monthlyData.map(m => m.sales || 0)).toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySales.monthlyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis 
                  scale="log" 
                  domain={[1, 'auto']}
                  label={{ value: 'Sales (₹)', angle: -90, position: 'insideLeft', offset: 10 }} 
                  tick={{ fontSize: 12 }}
                  allowDataOverflow={false}
                />
                <Tooltip 
                  formatter={(value) => {
                    if (value <= 1) return '₹0';
                    return `₹${value.toLocaleString('en-IN')}`;
                  }}
                  contentStyle={{ borderRadius: 4 }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="sales" fill="#0288d1" name="Sales Amount" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* Low Stock Alert */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Low Stock Alert</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="caption" sx={{ color: '#F44336' }}>● Low Stock</Typography>
                <Typography variant="caption" sx={{ color: '#4CAF50' }}>⟳ Restock</Typography>
              </Box>
            </Box>
            {lowStockItems.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
                All stock levels are healthy ✓
              </Typography>
            ) : (
              lowStockItems.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #E0E0E0' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FFA726' }} />
                    <Typography variant="body2">{item.category}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.quantity}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.threshold}</Typography>
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;
