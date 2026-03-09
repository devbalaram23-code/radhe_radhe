import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  useTheme
} from '@mui/material';

const PriceCalculator = () => {
  const theme = useTheme();
  const [weight, setWeight] = useState('');
  const [pricePerGram, setPricePerGram] = useState('');
  const [makingCharge, setMakingCharge] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);

  // Load settings from localStorage (Billing Settings)
  useEffect(() => {
    const savedGoldPrice = localStorage.getItem('todayGoldPrice') || '';
    const savedMakingCharge = localStorage.getItem('makingChargePerGram') || '';
    
    setPricePerGram(savedGoldPrice);
    setMakingCharge(savedMakingCharge);
  }, []);

  // Calculate total price whenever inputs change
  const calculatePrice = (w, ppg, mc) => {
    const weightVal = parseFloat(w) || 0;
    const priceVal = parseFloat(ppg) || 0;
    const makingVal = parseFloat(mc) || 0;
    
    const goldValue = weightVal * priceVal;
    const total = goldValue + makingVal;
    
    setTotalPrice(total);
  };

  const handleWeightChange = (e) => {
    const val = e.target.value;
    setWeight(val);
    calculatePrice(val, pricePerGram, makingCharge);
  };

  const handlePricePerGramChange = (e) => {
    const val = e.target.value;
    setPricePerGram(val);
    calculatePrice(weight, val, makingCharge);
  };

  const handleMakingChargeChange = (e) => {
    const val = e.target.value;
    setMakingCharge(val);
    calculatePrice(weight, pricePerGram, val);
  };

  const handleReset = () => {
    setWeight('');
    setTotalPrice(0);
  };

  return (
    <Paper 
      elevation={3}
      sx={{
        p: 3,
        mb: 4,
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
          : 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
        borderRadius: 2,
        borderLeft: `5px solid ${theme.palette.primary.main}`
      }}
    >
      <Typography 
        variant="h5" 
        gutterBottom
        sx={{
          fontWeight: 'bold',
          mb: 3,
          color: theme.palette.primary.main
        }}
      >
        💰 Price Calculator
      </Typography>

      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        📌 Using rates from Billing Settings
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Weight (grams)"
            type="number"
            value={weight}
            onChange={handleWeightChange}
            fullWidth
            placeholder="e.g., 5.5"
            variant="outlined"
            inputProps={{ step: '0.01', min: '0' }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#fff'
              }
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Price per Gram (₹)"
            type="number"
            value={pricePerGram}
            onChange={handlePricePerGramChange}
            fullWidth
            placeholder="From Billing Settings"
            variant="outlined"
            inputProps={{ step: '0.01', min: '0' }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#fff'
              }
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            (Gold rate from settings)
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Making Charge (₹)"
            type="number"
            value={makingCharge}
            onChange={handleMakingChargeChange}
            fullWidth
            placeholder="From Billing Settings"
            variant="outlined"
            inputProps={{ step: '0.01', min: '0' }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#fff'
              }
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            (Per gram from settings)
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box
            onClick={handleReset}
            sx={{
              p: 1.5,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: theme.palette.error.main,
              color: '#fff',
              borderRadius: 1,
              fontWeight: 'bold',
              transition: 'all 0.3s',
              '&:hover': {
                backgroundColor: theme.palette.error.dark,
                transform: 'scale(1.02)'
              }
            }}
          >
            Reset Weight
          </Box>
        </Grid>
      </Grid>

      {/* Result Card */}
      <Card
        sx={{
          background: theme.palette.primary.main,
          color: '#fff',
          borderRadius: 2,
          mt: 2
        }}
      >
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            Calculation: ({weight || 0} g × ₹{pricePerGram || 0}) + ₹{makingCharge || 0}
          </Typography>
          <Typography 
            variant="h4" 
            sx={{
              fontWeight: 'bold',
              fontSize: { xs: '1.8rem', sm: '2.2rem' }
            }}
          >
            ₹ {totalPrice.toFixed(2)}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, mt: 1, display: 'block' }}>
            Total Product Price
          </Typography>
        </CardContent>
      </Card>
    </Paper>
  );
};

export default PriceCalculator;
