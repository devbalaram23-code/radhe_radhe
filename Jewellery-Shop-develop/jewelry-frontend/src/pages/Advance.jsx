import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useThemeMode } from '../ThemeContext';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material';
import { toast, Toaster } from 'sonner';

function Advance() {
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
  const { mode } = useThemeMode();
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [advances, setAdvances] = useState([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);

  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerGstin, setNewCustomerGstin] = useState('');

  const [amount, setAmount] = useState('');
  const [goldPrice, setGoldPrice] = useState('');
  const [date, setDate] = useState('');
  const [remark, setRemark] = useState('');
  const [paymentMode, setPaymentMode] = useState('');

  const searchCustomers = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/api/customers/search?q=${encodeURIComponent(searchTerm)}`);
      const customers = res.data || [];
      setSearchResults(customers);
      setShowSearchResults(customers.length > 0);
    } catch (error) {
      console.error('Customer search failed:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchInput(value);
    searchCustomers(value);
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchInput('');
    setShowSearchResults(false);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName || !newCustomerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!newCustomerMobile || String(newCustomerMobile).length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setCreatingCustomer(true);
      const res = await axios.post(`${API_BASE}/api/customers`, {
        name: newCustomerName.trim(),
        mobileNumber: newCustomerMobile,
        address: newCustomerAddress || null,
        gstin: newCustomerGstin || null
      });

      const customer = res.data;
      
      // Check for duplicate mobile with different name
      if (res.status === 409 || customer?.conflict) {
        toast.error(
          `Duplicate found! "${customer.existingCustomer?.name}" already has this mobile. Using existing.`,
          { duration: 4000 }
        );
      } else if (customer?.isExisting) {
        toast.info(`Using existing customer: ${customer.name}`, { duration: 3000 });
      } else {
        toast.success('Customer created successfully', { duration: 3000 });
      }

      setSelectedCustomer(customer);
      setNewCustomerName('');
      setNewCustomerMobile('');
      setNewCustomerAddress('');
      setNewCustomerGstin('');
    } catch (error) {
      console.error('Failed to create customer:', error);
      
      // Handle 409 Conflict
      if (error.response?.status === 409) {
        const existing = error.response.data?.existingCustomer;
        toast.error(
          `Duplicate mobile! "${existing?.name}" already has this number. Using existing.`,
          { duration: 4000 }
        );
        // Use the existing customer
        setSelectedCustomer(existing);
        setNewCustomerName('');
        setNewCustomerMobile('');
        setNewCustomerAddress('');
        setNewCustomerGstin('');
      } else {
        const msg = error?.response?.data?.error || error?.message || 'Failed to create customer';
        toast.error(msg, { duration: 3000 });
      }
    } finally {
      setCreatingCustomer(false);
    }
  };

  const fetchAdvances = useCallback(async (customerId) => {
    if (!customerId) {
      setAdvances([]);
      return;
    }
    try {
      setLoadingAdvances(true);
      const res = await axios.get(`${API_BASE}/api/advances/customer/${customerId}?includeZero=true`);
      setAdvances(res.data || []);
    } catch (error) {
      console.error('Failed to fetch advances:', error);
      setAdvances([]);
    } finally {
      setLoadingAdvances(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchAdvances(selectedCustomer?.id);
  }, [selectedCustomer?.id, fetchAdvances]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setDate(today);
  }, []);

  const handleSaveAdvance = async () => {
    if (!selectedCustomer?.id) {
      toast.error('Please select a customer');
      return;
    }

    const amountValue = parseFloat(amount || 0);
    if (!amountValue || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSavingAdvance(true);
      await axios.post(`${API_BASE}/api/advances`, {
        customerId: selectedCustomer.id,
        amount: amountValue,
        goldPrice: goldPrice ? parseFloat(goldPrice) : undefined,
        date,
        remark,
        paymentMode
      });

      toast.success('Advance saved successfully');
      setAmount('');
      setGoldPrice('');
      setDate(new Date().toISOString().slice(0, 10));
      setRemark('');
      setPaymentMode('');
      fetchAdvances(selectedCustomer.id);
    } catch (error) {
      console.error('Failed to save advance:', error);
      const msg = error?.response?.data?.error || error?.message || 'Failed to save advance';
      toast.error(msg);
    } finally {
      setSavingAdvance(false);
    }
  };

  const totalRemaining = advances.reduce((sum, adv) => sum + (adv.remainingAmount || 0), 0);

  return (
    <>
      <Toaster position="top-right" richColors theme={mode} />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }} elevation={6}>
          <Typography variant="h4" gutterBottom>Advance Entry</Typography>

          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Customer</Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box>
                  <TextField
                    label="Search Customer"
                    placeholder="Type name or mobile"
                    value={customerSearchInput}
                    onChange={handleCustomerSearchChange}
                    fullWidth
                  />
                  {showSearchResults && searchResults.length > 0 && (
                    <Paper sx={{ mt: 1, maxHeight: 250, overflow: 'auto' }}>
                      <List>
                        {searchResults.map((customer, idx) => (
                          <ListItemButton
                            key={idx}
                            onClick={() => handleSelectCustomer(customer)}
                            sx={{ py: 1 }}
                          >
                            <ListItemText
                              primary={customer.name}
                              secondary={`${customer.mobileNumber || 'N/A'} • ${customer.address || 'N/A'}`}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Paper>
                  )}
                </Box>

                <TextField
                  label="Selected Customer"
                  value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.mobileNumber || 'N/A'})` : ''}
                  InputProps={{ readOnly: true }}
                />

                <Box sx={{ mt: 1, p: 2, borderRadius: 2, border: '1px dashed rgba(0,0,0,0.2)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>New Customer (if not found)</Typography>
                  <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <TextField
                      label="Customer Name"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                    <TextField
                      label="Mobile Number"
                      value={newCustomerMobile}
                      onChange={(e) => setNewCustomerMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputProps={{ maxLength: 10 }}
                      helperText="10 digits"
                    />
                    <TextField
                      label="Address"
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                      multiline
                      rows={2}
                    />
                    <TextField
                      label="GSTIN (optional)"
                      value={newCustomerGstin}
                      onChange={(e) => setNewCustomerGstin(e.target.value)}
                    />
                    <Button variant="outlined" onClick={handleCreateCustomer} disabled={creatingCustomer}>
                      {creatingCustomer ? 'Creating...' : 'Create Customer'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Advance Details</Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  label="Amount (₹)"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setAmount(value);
                    }
                  }}
                  placeholder="e.g., 10000"
                />
                <TextField
                  label="Gold Price (₹ per gram)"
                  value={goldPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setGoldPrice(value);
                    }
                  }}
                  placeholder="Optional"
                />
                <TextField
                  type="date"
                  label="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Card">Card</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                </TextField>
                <TextField
                  label="Remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Optional"
                  multiline
                  rows={2}
                />
                <Button variant="contained" onClick={handleSaveAdvance} disabled={savingAdvance}>
                  {savingAdvance ? 'Saving...' : 'Save Advance'}
                </Button>
              </Box>
            </Paper>
          </Box>

          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>Advance History</Typography>
            {loadingAdvances ? (
              <Typography color="text.secondary">Loading advances...</Typography>
            ) : advances.length === 0 ? (
              <Typography color="text.secondary">No advances found</Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Total Remaining</Typography>
                  <Typography>₹{totalRemaining.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Remaining</TableCell>
                        <TableCell>Gold Price</TableCell>
                        <TableCell>Payment</TableCell>
                        <TableCell>Remark</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {advances.map((adv) => (
                        <TableRow key={adv.id}>
                          <TableCell>{adv.date}</TableCell>
                          <TableCell>₹{Number(adv.amount || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(adv.remainingAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>{adv.goldPrice ? `₹${Number(adv.goldPrice).toFixed(2)}` : 'N/A'}</TableCell>
                          <TableCell>{adv.paymentMode || 'N/A'}</TableCell>
                          <TableCell>{adv.remark || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}
          </Paper>
        </Paper>
      </Container>
    </>
  );
}

export default Advance;
