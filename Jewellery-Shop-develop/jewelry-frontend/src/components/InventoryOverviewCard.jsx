import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Paper, LinearProgress, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { WarningAmber } from '@mui/icons-material';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const InventoryOverviewCard = () => {
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bestSelling, setBestSelling] = useState([]);
  const [lowStock, setLowStock] = useState([]);

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

      const productsData = productsRes.data || [];
      const billsData = billsRes.data || [];

      setProducts(productsData);
      setBills(billsData);

      // Calculate best-selling categories from PRODUCT CATEGORY
      const categoryStats = {};
      
      billsData.forEach(bill => {
        if (bill.billItems && Array.isArray(bill.billItems)) {
          bill.billItems.forEach(item => {
            // Skip old gold items
            if (item.hsnCode === 'OLD') {
              return;
            }
            
            // Find the product in inventory to get its category
            const product = productsData.find(p => p.productCode === item.productCode);
            const category = product?.category || item.itemDescription?.split('-')[0]?.trim() || 'Other';
            
            if (!categoryStats[category]) {
              categoryStats[category] = { timesSold: 0, totalWeight: 0 };
            }
            categoryStats[category].timesSold += 1;
            categoryStats[category].totalWeight += item.netGoldWeight || 0;
          });
        }
      });

      const bestSellingData = Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category,
          timesSold: stats.timesSold,
          totalWeight: parseFloat(stats.totalWeight.toFixed(2))
        }))
        .sort((a, b) => b.timesSold - a.timesSold)
        .slice(0, 5);

      setBestSelling(bestSellingData);

      // Low stock alert based on quantity per category (available items)
      const categoryCounts = productsData.reduce((acc, p) => {
        const category = p.category || 'Uncategorized';
        // only count items that are available/in stock
        if (p.isAvailable === false || p.inStock === false) {
          return acc;
        }
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      const lowStockData = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .filter(item => item.count <= 2) // threshold: 2 or fewer items left in that category
        .sort((a, b) => a.count - b.count)
        .slice(0, 5);

      setLowStock(lowStockData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
        <Typography>Loading inventory data...</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      {/* Best Selling Categories */}
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>🏆 Best-Selling Categories</Typography>

        {bestSelling.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No sales data available yet
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {bestSelling.map((item, idx) => (
              <Box key={idx}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {idx + 1}. {item.category}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      <strong>{item.timesSold}</strong> times sold • {item.totalWeight}g total
                    </Typography>
                  </Box>
                  <Typography 
                    sx={{ 
                      fontWeight: 'bold', 
                      color: '#d4af37',
                      fontSize: '12px',
                      bgcolor: 'rgba(212, 175, 55, 0.2)',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    #{idx + 1}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={((item.timesSold / (bestSelling[0]?.timesSold || 1)) * 100)} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: 'rgba(212, 175, 55, 0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#d4af37' } }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Low Stock Alert */}
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <WarningAmber sx={{ color: '#ff9800', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>⚠️ Low Stock Alert</Typography>
        </Box>

        {lowStock.length === 0 ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✓ All products are in stock
          </Alert>
        ) : (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {lowStock.length} categor{lowStock.length !== 1 ? 'ies are' : 'y is'} running low (≤2 items available)
            </Alert>
            
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '12px' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '12px' }} align="right">Available Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStock.map((item, idx) => (
                    <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <TableCell sx={{ fontSize: '12px' }}>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {item.category}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '12px' }} align="right">
                        {item.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default InventoryOverviewCard;
