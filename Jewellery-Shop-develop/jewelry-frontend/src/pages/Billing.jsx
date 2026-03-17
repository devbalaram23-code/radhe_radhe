import { useState, useEffect, useMemo } from "react";
import "../pages/Billing.css";
import axios from 'axios';
import BarcodeListener from '../components/BarcodeListener';
import { useThemeMode } from '../ThemeContext';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { printInvoice, saveBillToStorage } from '../utils/invoice';
import { toast, Toaster } from 'sonner';

function Billing() {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";
  const { mode } = useThemeMode();
  const [scannerActive, setScannerActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Prevent double-click

  // Duplicate customer dialog state
  const [duplicateCustomerDialog, setDuplicateCustomerDialog] = useState(false);
  const [duplicateCustomerData, setDuplicateCustomerData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [duplicateCustomerPending, setDuplicateCustomerPending] = useState(false);

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");

  // Payment details
  const [paymentMode, setPaymentMode] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

  // Current item being added
  const [itemDescription, setItemDescription] = useState("");
  const [hsnCode, setHsnCode] = useState("7113");
  const [purity, setPurity] = useState("22K (916)");
  // Use empty string for numeric inputs so the fields start empty instead of showing 0
  const [grossWeight, setGrossWeight] = useState("");
  const [stoneWeight, setStoneWeight] = useState("");
  const [netGoldWeight, setNetGoldWeight] = useState("");
  const [goldRatePerGram, setGoldRatePerGram] = useState("");
  const [makingValue, setMakingValue] = useState(""); // ₹ per gm
  const [otherCharges, setOtherCharges] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showOldGold, setShowOldGold] = useState(false);
  const [oldGoldWeight, setOldGoldWeight] = useState("");
  const [oldGoldPurity, setOldGoldPurity] = useState("22K (916)");
  const [oldGoldPercent, setOldGoldPercent] = useState(""); // new field: percentage of gold content in old gold
  const [oldGoldRatePerGram, setOldGoldRatePerGram] = useState(""); // rate per gram specifically for old gold
  const [oldGoldValue, setOldGoldValue] = useState(""); // Manual old gold value input

  const [billItems, setBillItems] = useState([]);
  const [currentProductCode, setCurrentProductCode] = useState("");
  const [manualProductCode, setManualProductCode] = useState(""); // For manual product code entry

  // Bill level fields
  const [gstPercent, setGstPercent] = useState(3.0);

  // Customer search
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    // Auto-populate gold rate and making charge from localStorage (set on Home page)
    const savedGoldPrice = localStorage.getItem('todayGoldPrice');
    const savedMakingCharge = localStorage.getItem('makingChargePerGram');
    
    if (savedGoldPrice) {
      setGoldRatePerGram(savedGoldPrice);
    }
    if (savedMakingCharge) {
      setMakingValue(savedMakingCharge);
    }
  }, []);

  // Search for existing customers
  const searchCustomers = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      console.log('Searching for customers with term:', searchTerm);
      const res = await axios.get(`${API_BASE}/api/customers/search?q=${encodeURIComponent(searchTerm)}`);
      console.log('Customer search response:', res.data);
      const customers = res.data || [];
      setSearchResults(customers);
      setShowSearchResults(customers.length > 0);
      if (customers.length === 0) {
        console.log('No customers found for search term:', searchTerm);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Handle customer search input change
  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchInput(value);
    searchCustomers(value);
  };

  // Select a customer from search results
  const handleSelectCustomer = (customer) => {
    setCustomerName(customer.name || "");
    // Strip +91 prefix if present to show only 10 digits in form
    const mobileWithoutPrefix = String(customer.mobileNumber || "").replace(/\D/g, '').slice(-10);
    setMobileNumber(mobileWithoutPrefix);
    setAddress(customer.address || "");
    setGstin(customer.gstin || "");
    setCustomerSearchInput("");
    setShowSearchResults(false);
    toast.success(`Customer ${customer.name} selected`);
  };

  // Save customer to database
  const saveCustomerToDB = async (name, mobile, customerAddress, customerGstin) => {
    // Define formattedMobile outside try-catch so it's accessible in both blocks
    const formattedMobile = String(mobile).startsWith('+91') ? mobile : `+91${mobile}`;
    
    try {
      const response = await axios.post(`${API_BASE}/api/customers`, {
        name,
        mobileNumber: formattedMobile,
        address: customerAddress,
        gstin: customerGstin
      });

      // Check if customer already exists with same mobile
      if (response.data?.isExisting) {
        toast.info(`Using existing customer: ${response.data.name}`, { duration: 3000 });
        return { success: true, isExisting: true };
      }

      return { success: true, isExisting: false };
    } catch (error) {
      // Handle 409 Conflict - duplicate mobile with different name
      if (error.response?.status === 409) {
        const existingCustomer = error.response.data?.existingCustomer;
        return { 
          success: false, 
          isDuplicate: true, 
          existingCustomer: existingCustomer
        };
      }

      const errorMsg = error.response?.data?.error || error.message || 'Failed to save customer';
      toast.error(errorMsg, { duration: 3000 });
      console.warn('Failed to save customer:', error.message || error);
      return { success: false, isDuplicate: false };
    }
  };

  // Handle duplicate customer - show dialog
  const handleDuplicateCustomer = (existingCustomer) => {
    setDuplicateCustomerData(existingCustomer);
    setDuplicateCustomerDialog(true);
  };

  // Use existing customer when duplicate is detected
  const handleUseExistingCustomer = () => {
    if (duplicateCustomerData) {
      setCustomerName(duplicateCustomerData.name);
      // Strip +91 prefix if present
      const mobileWithoutPrefix = String(duplicateCustomerData.mobileNumber || "").replace(/\D/g, '').slice(-10);
      setMobileNumber(mobileWithoutPrefix);
      setAddress(duplicateCustomerData.address || "");
      setGstin(duplicateCustomerData.gstin || "");
      
      toast.success(`Switched to existing customer: ${duplicateCustomerData.name}`);
    }
    setDuplicateCustomerDialog(false);
    setDuplicateCustomerData(null);
  };

  // Cancel duplicate customer dialog
  const handleCancelDuplicate = () => {
    setDuplicateCustomerDialog(false);
    setDuplicateCustomerData(null);
    setDuplicateCustomerPending(false);
  };

  // handle barcode scanned by hardware scanner
  async function handleBarcodeScanned(code) {
    if (!code) return;
    // If this barcode/product is already added to the bill, prevent re-adding
    if (billItems.find(it => it.productCode === code)) {
      toast.error(`Item with barcode ${code} is already added to the bill.`);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/products/barcode/${encodeURIComponent(code)}`);
      if (res.status === 200 && res.data) {
        // if API returned a product that's already on the bill, avoid populating it again
        if (res.data.productCode && billItems.find(it => it.productCode === res.data.productCode)) {
          toast.error(`Item with barcode ${res.data.productCode} is already added to the bill.`);
          return;
        }
        populateBillingFromProduct(res.data);
        // small feedback
        console.log('Scanned and populated:', code);
        return;
      }
      // not found -> fallback to cache
    } catch (err) {
      // Check if product is already sold
      if (err.response?.status === 400 && err.response?.data?.error === 'PRODUCT_ALREADY_SOLD') {
        const soldBy = err.response.data.deletedBy || 'unknown';
        toast.error(`Product ${code} has already been sold (${soldBy})`);
        return;
      }
      // ignore and try cache fallback below
      console.warn('Barcode lookup failed, falling back to cache:', err.message || err);
    }

    // fallback to cached products in localStorage
    try {
      const cached = JSON.parse(localStorage.getItem('products') || '[]');
      const found = cached.find(p => p && (p.productCode === code));
      if (found) {
        // Check if product is already sold
        if (found.isAvailable === false || found.inStock === false) {
          const soldBy = found.deletedBy || 'unknown';
          toast.error(`Product ${code} has already been sold (${soldBy})`);
          return;
        }
        if (billItems.find(it => it.productCode === found.productCode)) {
          toast.error(`Item with barcode ${found.productCode} is already added to the bill.`);
          return;
        }
        populateBillingFromProduct(found);
        return;
      }
    } catch (e) {
      console.warn('Cache lookup failed', e.message || e);
    }

    // still not found
    toast.error(`Product not found for barcode: ${code}`);
  }

  function populateBillingFromProduct(p) {
    if (!p) return;

    // remember product code so we can detect duplicates
    setCurrentProductCode(p.productCode || '');

    // Always populate only these three fields on barcode scan regardless of focus
    const descParts = [];
    if (p.category) descParts.push(p.category);
    if (p.productCode) descParts.push(p.productCode);
    setItemDescription(descParts.join(' - '));

    // Map carat to proper purity format
    const caratToPurity = {
      '24': '24K',
      '22': '22K (916)',
      '18': '18K'
    };
    const purityValue = p.carat ? (caratToPurity[String(p.carat)] || `${p.carat}K`) : '22K (916)';
    setPurity(purityValue);
    setGrossWeight(p.gram ? String(p.gram) : '');

    // keep other fields untouched so cashier's current inputs/focus are not interfered with
  }

  // Handle manual product code entry (when scanner is not working)
  async function handleManualProductCodeLookup(code) {
    if (!code || code.trim() === '') {
      toast.error('Please enter a product code');
      return;
    }

    const codeToSearch = code.trim();

    try {
      const res = await axios.get(`${API_BASE}/api/products/barcode/${encodeURIComponent(codeToSearch)}`);
      if (res.status === 200 && res.data) {
        populateBillingFromProduct(res.data);
        setManualProductCode(''); // Clear the input field after successful lookup
        toast.success('Product loaded successfully');
        return;
      }
    } catch (err) {
      // Check if product is already sold
      if (err.response?.status === 400 && err.response?.data?.error === 'PRODUCT_ALREADY_SOLD') {
        const soldBy = err.response.data.deletedBy || 'unknown';
        toast.error(`Product ${codeToSearch} has already been sold (${soldBy})`);
        setManualProductCode(''); // Clear the input field
        return;
      }
      // fallback to cache
    }

    // fallback to cached products in localStorage
    try {
      const cached = JSON.parse(localStorage.getItem('products') || '[]');
      const found = cached.find(p => p && (p.productCode === codeToSearch));
      if (found) {
        // Check if product is already sold
        if (found.isAvailable === false || found.inStock === false) {
          const soldBy = found.deletedBy || 'unknown';
          toast.error(`Product ${codeToSearch} has already been sold (${soldBy})`);
          setManualProductCode(''); // Clear the input field
          return;
        }
        populateBillingFromProduct(found);
        setManualProductCode(''); // Clear the input field after successful lookup
        toast.success('Product loaded successfully');
        return;
      }
    } catch (e) {
      console.warn('Cache lookup failed', e.message || e);
    }

    toast.error(`Product not found for code: ${codeToSearch}`);
    setManualProductCode(''); // Clear the input field
  }

  // Keep net gold weight in sync if user prefers automatic calculation
  useEffect(() => {
    const net = parseFloat((parseFloat(grossWeight || 0) - parseFloat(stoneWeight || 0)).toFixed(3));
    // keep the input empty when net is zero/invalid so the field doesn't show 0
    setNetGoldWeight(isNaN(net) || net === 0 ? "" : net);
  }, [grossWeight, stoneWeight]);

  // Auto-calculate old gold value when inputs change
  useEffect(() => {
    const w = parseFloat(oldGoldWeight || 0);
    const pct = parseFloat(oldGoldPercent || 0);
    const rate = parseFloat(oldGoldRatePerGram || 0);
    if (w > 0 && pct > 0 && rate > 0) {
      const val = w * (pct / 100) * rate;
      setOldGoldValue(val.toFixed(2));
    } else {
      setOldGoldValue("");
    }
  }, [oldGoldWeight, oldGoldPercent, oldGoldRatePerGram]);

  const computeGoldValue = () => {
    const net = parseFloat(netGoldWeight || 0);
    const rate = parseFloat(goldRatePerGram || 0);
    return parseFloat((net * rate).toFixed(2));
  };

  const computeMakingCharge = () => {
    const net = parseFloat(netGoldWeight || 0);
    const val = parseFloat(makingValue || 0);
    const res = parseFloat((net * val).toFixed(2));
    return isNaN(res) ? 0 : res;
  };

  const computeOldGoldValue = () => {
    // Auto-calculate: oldGoldValue = oldGoldWeight * (oldGoldPercent/100) * oldGoldRatePerGram
    const w = parseFloat(oldGoldWeight || 0);
    const pct = parseFloat(oldGoldPercent || 0);
    const rate = parseFloat(oldGoldRatePerGram || 0);
    const val = w * (pct / 100) * rate;
    return parseFloat(isNaN(val) ? 0 : val.toFixed(2));
  };

  const computeItemTotal = () => {
    const goldVal = computeGoldValue();
    const making = computeMakingCharge();
    const other = parseFloat(otherCharges || 0);
    const oldVal = computeOldGoldValue();
    // other charges are fixed per item; oldGoldValue is deducted
    return parseFloat((goldVal + making + other - oldVal).toFixed(2));
  };

  const addItemToBill = () => {
    // Basic validation
    if (!itemDescription) return;

    // Ensure Gold Rate is filled and valid
    if (goldRatePerGram === '' || isNaN(parseFloat(goldRatePerGram)) || parseFloat(goldRatePerGram) <= 0) {
      alert('Please enter a valid Gold Rate per gram (greater than 0).');
      const el = document.getElementById('billing-goldRatePerGram');
      if (el) el.focus();
      return;
    }

    // Ensure Making Value is filled and valid (allow 0 but must be a number)
    if (makingValue === '' || isNaN(parseFloat(makingValue))) {
      alert('Please enter a valid Making Charge (number).');
      const el2 = document.getElementById('billing-makingValue');
      if (el2) el2.focus();
      return;
    }

    // Prevent duplicate add when current product is already on bill
    if (currentProductCode && billItems.find(it => it.productCode === currentProductCode)) {
      alert(`Item with barcode ${currentProductCode} is already in the bill.`);
      return;
    }

    // Compute values
    const goldValue = computeGoldValue();
    const making = computeMakingCharge();
    const other = parseFloat(otherCharges || 0);
    const oldVal = computeOldGoldValue();

    // Main item total SHOULD NOT include old gold deduction when we split it out
    const mainTotal = parseFloat((goldValue + making + other).toFixed(2));

    const mainItem = {
      productCode: currentProductCode,
      itemDescription,
      hsnCode,
      purity,
      grossWeight: parseFloat(grossWeight || 0),
      stoneWeight: parseFloat(stoneWeight || 0),
      netGoldWeight: parseFloat(netGoldWeight || 0),
      goldRatePerGram: parseFloat(goldRatePerGram || 0),
      goldValue,
      makingValue: parseFloat(makingValue || 0),
      makingCharge: making,
      otherCharges: parseFloat(otherCharges || 0),
      // note: old gold fields are intentionally zeroed in main item when we create separate row
      oldGoldWeight: 0,
      oldGoldPurity: '22K (916)',
      oldGoldPercent: 0,
      oldGoldRatePerGram: 0,
      oldGoldValue: 0,
      remarks,
      total: mainTotal,
    };

    const toAdd = [mainItem];

    // If user provided old gold details, create a separate 'Old Gold' adjustment row
    if (oldVal && oldVal > 0) {
      const oldItem = {
        productCode: currentProductCode ? `${currentProductCode}-OLD` : 'OLD',
        itemDescription: `Old Gold (${oldGoldPurity})`,
        hsnCode: 'OLD',
        purity: oldGoldPurity,
        grossWeight: parseFloat(oldGoldWeight || 0),
        stoneWeight: 0,
        netGoldWeight: parseFloat((parseFloat(oldGoldWeight || 0) * (parseFloat(oldGoldPercent || 0) / 100)).toFixed(3)),
        goldRatePerGram: parseFloat(oldGoldRatePerGram || 0),
        goldValue: 0,
        makingValue: 0,
        makingCharge: 0,
        otherCharges: 0,
        oldGoldWeight: parseFloat(oldGoldWeight || 0),
        oldGoldPurity,
        oldGoldPercent: parseFloat(oldGoldPercent || 0),
        oldGoldRatePerGram: parseFloat(oldGoldRatePerGram || 0),
        oldGoldValue: parseFloat(oldVal || 0),
        remarks: 'Old gold deduction',
        total: 0, // deduction applied separately via oldGoldValue
      };
      toAdd.push(oldItem);
    }

    setBillItems([...billItems, ...toAdd]);

    // reset ALL jewellery item detail fields (but NOT gold rate and making charge - they persist across items)
    setItemDescription("");
    setHsnCode("7113");
    setPurity("22K (916)");
    setGrossWeight("");
    setStoneWeight("");
    setNetGoldWeight("");
    // NOTE: Do NOT reset goldRatePerGram and makingValue - they should persist for all items in the bill
    setOtherCharges("");
    setRemarks("");
    setShowOldGold(false);
    setOldGoldWeight("");
    setOldGoldPurity("22K (916)");
    setOldGoldPercent("");
    setOldGoldRatePerGram("");
    setOldGoldValue("");
    setCurrentProductCode("");
  };

  const removeItem = (index) => {
    const copy = [...billItems];
    copy.splice(index, 1);
    setBillItems(copy);
  };

  const handleSaveBill = async () => {
    if (isSaving) return; // Prevent double-click
    
    if (!billItems || billItems.length === 0) {
      alert('No items to save');
      return;
    }

    // Validate customer name is required
    if (!customerName || customerName.trim() === '') {
      toast.error('Please enter customer name');
      return;
    }

    // Validate mobile number is required and exactly 10 digits
    if (!mobileNumber || String(mobileNumber).trim() === '') {
      toast.error('Please enter mobile number');
      return;
    }
    if (String(mobileNumber).length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      const el2 = document.getElementById('mobile-number');
      if (el2) el2.focus();
      return;
    }

    setIsSaving(true); // Disable button
    setDuplicateCustomerPending(true); // Mark pending
    const billNumber = `INV-${Date.now()}`;
    const date = new Date().toLocaleDateString();
    
    // Format mobile number with +91 prefix
    const formattedMobileNumber = String(mobileNumber).startsWith('+91') ? mobileNumber : `+91${mobileNumber}`;
    
    // Sort items to ensure old gold appears at the bottom
    const sortedItems = [...billItems].sort((a, b) => {
      const aIsOld = a.hsnCode === 'OLD';
      const bIsOld = b.hsnCode === 'OLD';
      if (aIsOld && !bIsOld) return 1;
      if (!aIsOld && bIsOld) return -1;
      return 0;
    });
    
    const data = {
      billNumber,
      date,
      customerName,
      mobileNumber: formattedMobileNumber,
      address,
      gstin,
      paymentMode: paymentMode || undefined,
      amountPaid: amountPaid ? parseFloat(amountPaid) : undefined,
      billItems: sortedItems,
      subtotal,
      cgst: gstPercent/2,
      sgst: gstPercent/2,
      totalGst,
      roundOff,
      grandTotal,
    };

    try {
      // First, try to save customer to database
      const customerResult = await saveCustomerToDB(customerName, mobileNumber, address, gstin);
      
      // If duplicate customer detected, show dialog and STOP
      if (customerResult.isDuplicate) {
        setIsSaving(false);
        handleDuplicateCustomer(customerResult.existingCustomer);
        return; // Don't proceed with bill save
      }

      // If failed for other reason, stop
      if (!customerResult.success) {
        setIsSaving(false);
        setDuplicateCustomerPending(false);
        return;
      }

      // Only save bill if customer creation was successful and no duplicates
      await saveBillToStorage(data);
      toast.success('Bill saved successfully!');
      printInvoice(data);
      
      // Clear the form after successful save
      setBillItems([]);
      setCustomerName('');
      setMobileNumber('');
      setAddress('');
      setGstin('');
      setPaymentMode('');
      setAmountPaid('');
    } catch (error) {
      toast.error(`Failed to save bill: ${error.message}`);
      console.error('Error saving bill:', error);
    } finally {
      setIsSaving(false); // Re-enable button
      setDuplicateCustomerPending(false);
    }
  };



  // Summary calculations - memoized to prevent unnecessary recalculations
  const { subtotal, totalMaking, totalOther, totalOld, totalGst, grandTotal, roundOff } = useMemo(() => {
    const sub = billItems.reduce((s, it) => s + (it.goldValue || 0), 0);
    const tMaking = billItems.reduce((s, it) => s + (it.makingCharge || 0), 0);
    const tOther = billItems.reduce((s, it) => s + (it.otherCharges || 0), 0);
    const tOld = billItems.reduce((s, it) => s + (it.oldGoldValue || 0), 0);
    const tBase = parseFloat((sub + tMaking + tOther).toFixed(2));
    const tGst = parseFloat(((tBase * parseFloat(gstPercent || 0)) / 100).toFixed(2));
    const beforeRound = parseFloat((tBase + tGst - tOld).toFixed(2));
    const grand = Math.round(beforeRound);
    const offset = parseFloat((grand - beforeRound).toFixed(2));
    
    return {
      subtotal: sub,
      totalMaking: tMaking,
      totalOther: tOther,
      totalOld: tOld,
      totalGst: tGst,
      grandTotal: grand,
      roundOff: offset
    };
  }, [billItems, gstPercent]);

  return (
    <>
      <Toaster position="top-right" richColors theme={mode} />
      <Container className="page-billing" maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <BarcodeListener onBarcode={handleBarcodeScanned} enabled={scannerActive} />
      <Paper sx={{ p: 3, borderRadius: 3 }} elevation={6}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" gutterBottom>Billing</Typography>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'gray' }}>{scannerActive ? 'Scanner: ON' : 'Scanner: OFF'}</div>
            <Button size="small" variant="outlined" onClick={() => setScannerActive(s => !s)}>{scannerActive ? 'Disable Scanner' : 'Enable Scanner'}</Button>
          </div>
        </div>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>Customer Details</Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box>
                  <TextField 
                    label="Search Existing Customer" 
                    placeholder="Type customer name to search..."
                    value={customerSearchInput} 
                    onChange={handleCustomerSearchChange}
                    fullWidth
                    helperText="Type to search for existing customers"
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
                  label="Customer Name" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Name will appear here or enter new name"
                />
                <TextField 
                  id="mobile-number"
                  label="Mobile Number" 
                  value={mobileNumber} 
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g,'').slice(0,10))} 
                  inputProps={{ maxLength: 10 }} 
                  helperText="10 digits"
                />
                <TextField 
                  label="Address" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  onFocus={() => setScannerActive(false)}
                  onBlur={() => setScannerActive(true)}
                  multiline
                  rows={2}
                  fullWidth
                />
                <TextField 
                  label="GSTIN (if B2B)" 
                  value={gstin} 
                  onChange={(e) => setGstin(e.target.value)} 
                />
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>Payment Details (Optional)</Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField 
                  select 
                  label="Payment Mode" 
                  value={paymentMode} 
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <MenuItem value="">Not Specified</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Card">Card</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                </TextField>
                <TextField 
                  label="Amount Paid (₹)" 
                  type="text" 
                  value={amountPaid} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setAmountPaid(value);
                    }
                  }}
                  helperText={amountPaid && grandTotal ? `Balance: ₹${(grandTotal - parseFloat(amountPaid || 0)).toFixed(2)}` : ''}
                  placeholder="e.g., 5000"
                />
              </Box>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Jewellery Item Details</Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'flex-end' }}>
                  <TextField 
                    id="billing-productCode" 
                    label="Product Code (Manual Lookup)" 
                    placeholder="Enter product code if scanner not working" 
                    value={manualProductCode}
                    onChange={(e) => setManualProductCode(e.target.value)}
                    fullWidth
                  />
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => handleManualProductCodeLookup(manualProductCode)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    Add
                  </Button>
                </Box>
                <TextField id="billing-itemDescription" label="Item Description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="e.g. Gold Necklace" />
                <TextField id="billing-hsnCode" label="HSN Code" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} />
                <TextField id="billing-purity" select label="Purity" value={purity} onChange={(e) => setPurity(e.target.value)}>
                  <MenuItem value="24K">24K</MenuItem>
                  <MenuItem value="22K (916)">22K (916)</MenuItem>
                  <MenuItem value="22K">22K</MenuItem>
                  <MenuItem value="18K">18K</MenuItem>
                </TextField>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField 
                      id="billing-grossWeight" 
                      label="Gross Weight (gm)" 
                      type="text" 
                      value={grossWeight} 
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setGrossWeight(value);
                        }
                      }}
                      fullWidth
                      placeholder="e.g., 10.5"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField 
                      id="billing-stoneWeight" 
                      label="Stone Weight (gm)" 
                      type="text" 
                      value={stoneWeight} 
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setStoneWeight(value);
                        }
                      }}
                      fullWidth
                      placeholder="e.g., 2.3"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField 
                      id="billing-netGoldWeight" 
                      label="Net Gold Weight (gm)" 
                      type="text" 
                      value={netGoldWeight} 
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setNetGoldWeight(value);
                        }
                      }}
                      fullWidth
                      placeholder="Auto-calculated"
                    />
                  </Grid>
                </Grid>

                <TextField 
                  id="billing-goldRatePerGram" 
                  label="Gold Rate per gram (₹)" 
                  type="text" 
                  value={goldRatePerGram} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setGoldRatePerGram(value);
                    }
                  }}
                  helperText="Required" 
                  placeholder="e.g., 7200"
                />
                <TextField label="Gold Value" value={computeGoldValue()} InputProps={{ readOnly: true }} />

                <Box>
                  <Typography variant="subtitle2">Making Charges (₹ per gm)</Typography>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs>
                      <TextField 
                        id="billing-makingValue" 
                        type="text" 
                        value={makingValue} 
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setMakingValue(value);
                          }
                        }}
                        placeholder="₹ per gm" 
                        fullWidth 
                        helperText="Required" 
                      />
                    </Grid>
                    <Grid item>
                      <TextField label="Making" value={computeMakingCharge()} InputProps={{ readOnly: true }} />
                    </Grid>
                  </Grid>
                </Box>

                <TextField 
                  id="billing-otherCharges" 
                  label="Other Charges (₹)" 
                  type="text" 
                  value={otherCharges} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setOtherCharges(value);
                    }
                  }}
                  placeholder="e.g., 100"
                />
                <TextField id="billing-remarks" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button variant="contained" color="secondary" onClick={() => setShowOldGold(!showOldGold)}>{showOldGold ? 'Hide Old Gold' : 'Add Old Gold'}</Button>
                  <Typography sx={{ ml: 1 }}>Total Item Amount: <strong>₹{computeItemTotal()}</strong></Typography>
                </Box>

                {showOldGold && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 2, 
                    p: 2, 
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(212, 175, 55, 0.08)' : '#fffbf0',
                    border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(212, 175, 55, 0.3)' : '#f0e5d0'}`,
                    borderRadius: 2 
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#d4af37' }}>Old Gold Details</Typography>
                    
                    <TextField 
                      id="billing-oldGoldWeight" 
                      label="Old Gold Weight (gm)" 
                      type="text"
                      value={oldGoldWeight} 
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setOldGoldWeight(value);
                        }
                      }}
                      fullWidth
                      placeholder="Enter weight (e.g., 10.5, 2.7)"
                    />
                    
                    <TextField 
                      select 
                      label="Old Gold Purity" 
                      value={oldGoldPurity} 
                      onChange={(e) => setOldGoldPurity(e.target.value)} 
                      fullWidth
                    >
                      <MenuItem value="24K">24K</MenuItem>
                      <MenuItem value="22K (916)">22K (916)</MenuItem>
                      <MenuItem value="22K">22K</MenuItem>
                      <MenuItem value="18K">18K</MenuItem>
                    </TextField>
                    
                    <TextField 
                      id="billing-oldGoldPercent" 
                      label="Gold % in Old Gold" 
                      type="text"
                      value={oldGoldPercent} 
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          if (value === '' || parseFloat(value) <= 100) {
                            setOldGoldPercent(value);
                          }
                        }
                      }}
                      fullWidth
                      placeholder="e.g., 91.6 for 22K"
                    />
                    
                    <TextField 
                      id="billing-oldGoldRatePerGram" 
                      label="Old Gold Rate per gram (₹)" 
                      type="text"
                      value={oldGoldRatePerGram} 
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setOldGoldRatePerGram(value);
                        }
                      }}
                      fullWidth
                    />
                    
                    <TextField 
                      id="billing-oldGoldValue" 
                      label="Old Gold Value (₹)" 
                      type="text"
                      value={oldGoldValue} 
                      fullWidth
                      InputProps={{ readOnly: true }}
                      helperText="Auto-calculated based on weight, % and rate"
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(212, 175, 55, 0.05)' : '#fffef5',
                          '& fieldset': { 
                            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(212, 175, 55, 0.5)' : '#d4af37' 
                          },
                        }
                      }}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Button 
                        variant="contained" 
                        color="warning"
                        onClick={() => {
                          if (!oldGoldWeight || parseFloat(oldGoldWeight) <= 0) {
                            toast.error('Please enter old gold weight');
                            return;
                          }
                          if (!oldGoldValue || parseFloat(oldGoldValue) <= 0) {
                            toast.error('Old gold value must be greater than 0');
                            return;
                          }
                          // Add old gold as a separate item
                          const oldItem = {
                            productCode: 'OLD-GOLD',
                            itemDescription: `Old Gold (${oldGoldPurity})`,
                            hsnCode: 'OLD',
                            purity: oldGoldPurity,
                            grossWeight: parseFloat(oldGoldWeight || 0),
                            stoneWeight: 0,
                            netGoldWeight: parseFloat((parseFloat(oldGoldWeight || 0) * (parseFloat(oldGoldPercent || 0) / 100)).toFixed(3)),
                            goldRatePerGram: parseFloat(oldGoldRatePerGram || 0),
                            goldValue: 0,
                            makingValue: 0,
                            makingCharge: 0,
                            otherCharges: 0,
                            oldGoldWeight: parseFloat(oldGoldWeight || 0),
                            oldGoldPurity,
                            oldGoldPercent: parseFloat(oldGoldPercent || 0),
                            oldGoldRatePerGram: parseFloat(oldGoldRatePerGram || 0),
                            oldGoldValue: parseFloat(oldGoldValue || 0),
                            remarks: 'Old gold deduction',
                            total: 0,
                          };
                          setBillItems([...billItems, oldItem]);
                          toast.success('Old gold added to bill');
                          // Clear old gold fields
                          setOldGoldWeight('');
                          setOldGoldPercent('');
                          setOldGoldRatePerGram('');
                          setOldGoldValue('');
                          setShowOldGold(false);
                        }}
                        sx={{ flex: 1 }}
                      >
                        Add Old Gold to Bill
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="secondary"
                        onClick={() => setShowOldGold(false)}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button variant="contained" color="primary" size="large" onClick={addItemToBill} sx={{ fontSize: '16px', padding: '12px 48px', fontWeight: 600 }}>Add Item</Button>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6">Bill Items</Typography>
              {billItems.length === 0 && <Typography color="text.secondary">No items added</Typography>}
              {billItems.length > 0 && (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>HSN</TableCell>
                        <TableCell>Purity</TableCell>
                        <TableCell>Gross(gm)</TableCell>
                        <TableCell>Rate</TableCell>
                        <TableCell>Net(gm)</TableCell>
                        <TableCell>Gold Value</TableCell>
                        <TableCell>Making</TableCell>
                        <TableCell>Other</TableCell>
                        <TableCell>Old Gold</TableCell>
                        <TableCell>Remarks</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...billItems].sort((a, b) => {
                        const aIsOld = a.hsnCode === 'OLD';
                        const bIsOld = b.hsnCode === 'OLD';
                        if (aIsOld && !bIsOld) return 1;
                        if (!aIsOld && bIsOld) return -1;
                        return 0;
                      }).map((it, idx) => (
                        <TableRow key={idx} sx={{ bgcolor: it.hsnCode === 'OLD' ? 'rgba(255, 245, 230, 0.5)' : 'inherit' }}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{it.itemDescription}</TableCell>
                          <TableCell>{it.hsnCode}</TableCell>
                          <TableCell>{it.purity}</TableCell>
                          <TableCell>{it.grossWeight}</TableCell>
                          <TableCell>₹{it.goldRatePerGram}</TableCell>
                          <TableCell>{it.netGoldWeight}</TableCell>
                          <TableCell>₹{it.goldValue}</TableCell>
                          <TableCell>₹{it.makingCharge}</TableCell>
                          <TableCell>₹{it.otherCharges}</TableCell>
                          <TableCell>₹{it.oldGoldValue}</TableCell>
                          <TableCell>{it.remarks}</TableCell>
                          <TableCell>{(it.total === 0 && it.oldGoldValue) ? `-₹${(it.oldGoldValue || 0).toFixed(2)}` : `₹${(it.total || 0).toFixed(2)}`}</TableCell>
                          <TableCell>
                            <Button size="small" color="error" onClick={() => removeItem(idx)}>Remove</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Bill Summary</Typography>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Subtotal (Gold Value)</Typography><Typography>₹{subtotal.toFixed(2)}</Typography></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Total Making Charges</Typography><Typography>₹{totalMaking.toFixed(2)}</Typography></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Other Charges</Typography><Typography>₹{totalOther.toFixed(2)}</Typography></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Old Gold Value</Typography><Typography>-₹{totalOld.toFixed(2)}</Typography></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>GST %</Typography>
                  <TextField 
                    type="text" 
                    value={gstPercent} 
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setGstPercent(value ? parseFloat(value) : '');
                      }
                    }}
                    size="small" 
                    sx={{ width: 100 }} 
                    placeholder="3.0"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Total GST</Typography><Typography>₹{totalGst.toFixed(2)}</Typography></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Round Off</Typography><Typography>₹{roundOff.toFixed(2)}</Typography></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}><Typography variant="h6">Grand Total</Typography><Typography variant="h6">₹{grandTotal.toFixed(2)}</Typography></Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="large" 
                    onClick={handleSaveBill}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save & Print Bill'}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Container>

    {/* Duplicate Customer Dialog */}
    <Dialog open={duplicateCustomerDialog} onClose={handleCancelDuplicate} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#ff6b6b', color: 'white', fontWeight: 'bold' }}>
        ⚠️ Duplicate Mobile Number Detected
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          This mobile number <strong>{mobileNumber}</strong> is already registered with:
        </Typography>
        <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', borderLeft: '4px solid #ff6b6b' }}>
          <Typography variant="body2">
            <strong>Name:</strong> {duplicateCustomerData?.name}
          </Typography>
          <Typography variant="body2">
            <strong>Mobile:</strong> {duplicateCustomerData?.mobileNumber}
          </Typography>
          {duplicateCustomerData?.address && (
            <Typography variant="body2">
              <strong>Address:</strong> {duplicateCustomerData.address}
            </Typography>
          )}
        </Paper>
        <Typography variant="body2" sx={{ mt: 2, color: '#666' }}>
          Would you like to use this existing customer or cancel?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleCancelDuplicate} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button onClick={handleUseExistingCustomer} variant="contained" color="success">
          Use Existing Customer
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

export default Billing;
