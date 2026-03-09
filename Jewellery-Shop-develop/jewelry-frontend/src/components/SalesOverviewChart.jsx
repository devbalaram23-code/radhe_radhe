import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { Box, Typography, Paper } from '@mui/material';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const SalesOverviewChart = () => {
  const chartColors = {
    cardBg: '#1a2332',
    cardText: '#e6eef8',
    cardSubtle: '#b8c5d6',
    grid: 'rgba(255, 255, 255, 0.12)',
    tooltipBg: '#0f1724',
    tooltipBorder: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.08)',
    axis: '#dfe6f3'
  };

  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState({ total: 0, avg: 0, highest: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, avg: 0, highest: 0 });

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/bills`);
      const bills = response.data || [];

      const { data: weekly, stats: weeklyStat } = generateWeeklyData(bills);
      const { data: monthly, stats: monthlyStat } = generateMonthlyData(bills);

      // Debug weekly aggregation to verify dates and totals
      // console.log('Weekly window data:', weekly);
      // console.log('Weekly stats:', weeklyStat);

      setWeeklyData(weekly);
      setMonthlyData(monthly);
      setWeeklyStats(weeklyStat);
      setMonthlyStats(monthlyStat);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setLoading(false);
    }
  };

  const generateWeeklyData = (bills) => {
    const now = new Date();
    // Work in UTC date keys to avoid timezone shifts when bills are near midnight
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekData = [];

    // Initialize last 7 days using UTC dates (today + previous 6 days)
    for (let i = 6; i >= 0; i--) {
      const dateUTC = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate() - i));
      const dateKey = dateUTC.toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
      const dayName = dateUTC.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = dateUTC.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      weekData.push({ dateKey, day: dayName, date: dateStr, sales: 0, orders: 0 });
    }

    // Aggregate bills by the raw UTC date part of createdAt
    const startUTC = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate() - 6));
    const endUTC = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate(), 23, 59, 59, 999));

    bills.forEach(bill => {
      if (bill.createdAt) {
        const rawDateKey = String(bill.createdAt).split('T')[0]; // take the date portion as stored (UTC date)
        const billDateUTC = new Date(rawDateKey + 'T00:00:00Z');

        if (billDateUTC >= startUTC && billDateUTC <= endUTC) {
          const dayBucket = weekData.find(d => d.dateKey === rawDateKey);
          if (dayBucket) {
            dayBucket.sales += bill.grandTotal || 0;
            dayBucket.orders += 1;
          }
        }
      }
    });

    const data = weekData.map(item => ({
      day: item.date, // show date label on axis
      sales: item.sales > 0 ? parseFloat(item.sales.toFixed(2)) : 0.01, // minimum value for log scale
      orders: item.orders
    }));

    const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
    const avgSales = data.filter(d => d.orders > 0).length > 0 
      ? totalSales / data.filter(d => d.orders > 0).length 
      : 0;
    const highest = Math.max(...data.map(d => d.sales), 0);

    const stats = {
      total: parseFloat(totalSales.toFixed(2)),
      avg: parseFloat(avgSales.toFixed(2)),
      highest: parseFloat(highest.toFixed(2))
    };

    return { data, stats };
  };

  const generateMonthlyData = (bills) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Initialize 12 months of current year
    const monthlyData = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { month: monthNames[i], sales: 0, orders: 0 };
    }

    // Aggregate bills by month
    bills.forEach(bill => {
      if (bill.createdAt) {
        const billDate = new Date(bill.createdAt);
        if (billDate.getFullYear() === currentYear) {
          const monthIdx = billDate.getMonth();
          monthlyData[monthIdx].sales += bill.grandTotal || 0;
          monthlyData[monthIdx].orders += 1;
        }
      }
    });

    const data = Object.values(monthlyData).map(item => ({
      ...item,
      sales: item.sales > 0 ? parseFloat(item.sales.toFixed(2)) : 0.01 // tiny floor for log scale
    }));

    const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
    const avgSales = data.filter(d => d.orders > 0).length > 0 
      ? totalSales / data.filter(d => d.orders > 0).length 
      : 0;
    const highest = Math.max(...data.map(d => d.sales), 0);

    const stats = {
      total: parseFloat(totalSales.toFixed(2)),
      avg: parseFloat(avgSales.toFixed(2)),
      highest: parseFloat(highest.toFixed(2))
    };

    return { data, stats };
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
        <Typography>Loading sales data...</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      {/* Weekly */}
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, bgcolor: chartColors.cardBg, color: chartColors.cardText, border: `1px solid ${chartColors.border}` }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>📅 Weekly Sales (Last 7 days)</Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 2,
          mb: 3,
          alignItems: 'stretch'
        }}>
          <StatCard label="Total Sales" value={weeklyStats.total} color="#d4af37" bg="rgba(212, 175, 55, 0.1)" border="rgba(212, 175, 55, 0.3)" labelColor={chartColors.cardSubtle} />
          <StatCard label="Average" value={weeklyStats.avg} color="#4caf50" bg="rgba(76, 175, 80, 0.1)" border="rgba(76, 175, 80, 0.3)" labelColor={chartColors.cardSubtle} />
          <StatCard label="Highest" value={weeklyStats.highest} color="#2196f3" bg="rgba(33, 150, 243, 0.1)" border="rgba(33, 150, 243, 0.3)" labelColor={chartColors.cardSubtle} />
        </Box>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: chartColors.axis }} />
            <YAxis 
              scale="log" 
              domain={[1, 'auto']}
              label={{ value: 'Sales (₹)', angle: -90, position: 'insideLeft', offset: 10, fill: chartColors.axis }} 
              tick={{ fontSize: 12, fill: chartColors.axis }}
              allowDataOverflow={false}
            />
            <Tooltip 
              formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
              contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 4, color: chartColors.cardText }}
              labelStyle={{ color: chartColors.cardSubtle }}
            />
            <Legend wrapperStyle={{ color: chartColors.cardText }} />
            <Bar dataKey="sales" fill="#d4af37" name="Sales Amount" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Monthly */}
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, bgcolor: chartColors.cardBg, color: chartColors.cardText, border: `1px solid ${chartColors.border}` }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>🗓️ Monthly Sales (This Year)</Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 2,
          mb: 3,
          alignItems: 'stretch'
        }}>
          <StatCard label="Total Sales" value={monthlyStats.total} color="#d4af37" bg="rgba(212, 175, 55, 0.1)" border="rgba(212, 175, 55, 0.3)" labelColor={chartColors.cardSubtle} />
          <StatCard label="Average" value={monthlyStats.avg} color="#4caf50" bg="rgba(76, 175, 80, 0.1)" border="rgba(76, 175, 80, 0.3)" labelColor={chartColors.cardSubtle} />
          <StatCard label="Highest" value={monthlyStats.highest} color="#2196f3" bg="rgba(33, 150, 243, 0.1)" border="rgba(33, 150, 243, 0.3)" labelColor={chartColors.cardSubtle} />
        </Box>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: chartColors.axis }} />
            <YAxis 
              scale="log" 
              domain={[1, 'auto']}
              label={{ value: 'Sales (₹)', angle: -90, position: 'insideLeft', offset: 10, fill: chartColors.axis }} 
              tick={{ fontSize: 12, fill: chartColors.axis }}
              allowDataOverflow={false}
            />
            <Tooltip 
              formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
              contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 4, color: chartColors.cardText }}
              labelStyle={{ color: chartColors.cardSubtle }}
            />
            <Legend wrapperStyle={{ color: chartColors.cardText }} />
            <Bar dataKey="sales" fill="#0288d1" name="Sales Amount" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default SalesOverviewChart;

// Small stat card helper
function StatCard({ label, value, color, bg, border, labelColor }) {
  return (
    <Box sx={{
      flex: 1,
      minWidth: 120,
      p: 1.5,
      bgcolor: bg,
      border: `1px solid ${border}`,
      borderRadius: 1.5,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 0.5,
      minHeight: 90
    }}>
      <Typography variant="caption" sx={{ color: labelColor || '#999', display: 'block' }}>{label}</Typography>
      <Typography 
        variant="h6" 
        sx={{ 
          color, 
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: 18
        }}
      >
        ₹{Number(value || 0).toLocaleString('en-IN')}
      </Typography>
    </Box>
  );
}
