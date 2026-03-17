import { useState, useEffect } from "react";
import axios from 'axios';
import { useThemeMode } from '../ThemeContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { toast, Toaster } from 'sonner';
import './Customers.css';

function Customers() {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";
  const { mode } = useThemeMode();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [customerHistory, setCustomerHistory] = useState({ bills: [], advances: [] });

  // Fetch all customers
  useEffect(() => {
    fetchAllCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/customers`);
      setCustomers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  // Search customers
  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (!term || term.trim().length < 2) {
      fetchAllCustomers();
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/api/customers/search?q=${encodeURIComponent(term)}`);
      setCustomers(res.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    }
  };

  // View customer details
  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCustomer(null);
  };

  const handleOpenHistory = async (customer) => {
    try {
      setSelectedCustomer(customer);
      setHistoryDialogOpen(true);
      setHistoryLoading(true);
      const res = await axios.get(`${API_BASE}/api/customers/${customer.id}/history`);
      setCustomerHistory(res.data || { bills: [], advances: [] });
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Failed to fetch customer history');
      setCustomerHistory({ bills: [], advances: [] });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setHistoryDialogOpen(false);
    setHistoryLoading(false);
    setCustomerHistory({ bills: [], advances: [] });
  };

  return (
    <>
      <Toaster position="top-right" richColors theme={mode} />
      <Container maxWidth={false} sx={{ mt: 4, mb: 6 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }} elevation={6}>
          <Typography variant="h4" gutterBottom>Customer Management</Typography>

          {/* Search Section */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Search Customers"
              placeholder="Search by name, mobile number, or address..."
              value={searchTerm}
              onChange={handleSearch}
              variant="outlined"
              helperText="Type at least 2 characters to search"
            />
          </Box>

          {/* Customers Table */}
          {loading ? (
            <Typography sx={{ textAlign: 'center', py: 3 }}>Loading customers...</Typography>
          ) : customers.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No customers found
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>#</TableCell>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>Mobile Number</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>GSTIN</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.map((customer, idx) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.mobileNumber || 'N/A'}</TableCell>
                      <TableCell>{customer.address || 'N/A'}</TableCell>
                      <TableCell>{customer.gstin || 'N/A'}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handleViewDetails(customer)}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          onClick={() => handleOpenHistory(customer)}
                          sx={{ ml: 1 }}
                        >
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Container>

      {/* Customer Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '18px' }}>Customer Details</DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box sx={{ display: 'grid', gap: 2, mt: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#d4af37' }}>
                  Customer Name
                </Typography>
                <Typography>{selectedCustomer.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#d4af37' }}>
                  Mobile Number
                </Typography>
                <Typography>{selectedCustomer.mobileNumber || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#d4af37' }}>
                  Address
                </Typography>
                <Typography>{selectedCustomer.address || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#d4af37' }}>
                  GSTIN
                </Typography>
                <Typography>{selectedCustomer.gstin || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#d4af37' }}>
                  Customer ID
                </Typography>
                <Typography>{selectedCustomer.id}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer History Dialog */}
      <Dialog open={historyDialogOpen} onClose={handleCloseHistory} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '18px' }}>
          Customer History
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Typography sx={{ py: 2 }}>Loading history...</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 3, mt: 1 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Bills</Typography>
                {customerHistory.bills.length === 0 ? (
                  <Typography color="text.secondary">No bills found</Typography>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Bill No</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Grand Total</TableCell>
                          <TableCell align="right">Advance Used</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerHistory.bills.map((bill) => (
                          <TableRow key={bill.id} hover>
                            <TableCell>{bill.billNumber}</TableCell>
                            <TableCell>{bill.date}</TableCell>
                            <TableCell align="right">₹{Number(bill.grandTotal || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{Number(bill.advanceApplied || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Advances</Typography>
                {customerHistory.advances.length === 0 ? (
                  <Typography color="text.secondary">No advances found</Typography>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="right">Remaining</TableCell>
                          <TableCell align="right">Gold Price</TableCell>
                          <TableCell>Payment</TableCell>
                          <TableCell>Remark</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerHistory.advances.map((adv) => (
                          <TableRow key={adv.id} hover>
                            <TableCell>{adv.date}</TableCell>
                            <TableCell align="right">₹{Number(adv.amount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{Number(adv.remainingAmount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">{adv.goldPrice ? `₹${Number(adv.goldPrice).toFixed(2)}` : 'N/A'}</TableCell>
                            <TableCell>{adv.paymentMode || 'N/A'}</TableCell>
                            <TableCell>{adv.remark || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistory} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Customers;
