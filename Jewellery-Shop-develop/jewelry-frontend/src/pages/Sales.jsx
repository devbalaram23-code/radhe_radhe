import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Search, Visibility, Print } from "@mui/icons-material";
import "./Sales.css";
import { printInvoice } from "../utils/invoice";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

function Sales() {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const filterBills = useCallback(() => {
    let filtered = [...bills];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (bill) =>
          bill.billNumber.toLowerCase().includes(search) ||
          (bill.customerName &&
            bill.customerName.toLowerCase().includes(search)) ||
          (bill.mobileNumber && bill.mobileNumber.includes(search)),
      );
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((bill) => {
        const billDate = new Date(bill.createdAt);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && end) {
          return billDate >= start && billDate <= end;
        } else if (start) {
          return billDate >= start;
        } else if (end) {
          return billDate <= end;
        }
        return true;
      });
    }

    setFilteredBills(filtered);
  }, [bills, searchTerm, startDate, endDate]);

  useEffect(() => {
    fetchBills();
  }, []);

  useEffect(() => {
    filterBills();
  }, [filterBills]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/bills`);
      setBills(response.data);
      setFilteredBills(response.data);
    } catch (error) {
      console.error("Error fetching bills:", error);
      alert("Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (bill) => {
    setSelectedBill(bill);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBill(null);
  };

  const handleReprint = (bill) => {
    printInvoice(bill);
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="sales-container">
      <Box className="sales-header">
        <Typography variant="h4" component="h1">
          Sales History
        </Typography>
      </Box>

      <Box className="sales-filters">
        <TextField
          label="Search"
          placeholder="Bill number, customer name, mobile..."
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-field"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Start Date"
          type="date"
          variant="outlined"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          className="date-field"
        />

        <TextField
          label="End Date"
          type="date"
          variant="outlined"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          className="date-field"
        />

        <Button
          variant="outlined"
          onClick={() => {
            setSearchTerm("");
            setStartDate("");
            setEndDate("");
          }}
        >
          Clear Filters
        </Button>
      </Box>

      <TableContainer component={Paper} className="sales-table">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Bill Number</strong>
              </TableCell>
              <TableCell>
                <strong>Date</strong>
              </TableCell>
              <TableCell>
                <strong>Customer Name</strong>
              </TableCell>
              <TableCell>
                <strong>Mobile</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Total Amount</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No bills found
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => (
                <TableRow key={bill.id} hover>
                  <TableCell>{bill.billNumber}</TableCell>
                  <TableCell>{bill.date}</TableCell>
                  <TableCell>{bill.customerName || "N/A"}</TableCell>
                  <TableCell>{bill.mobileNumber || "N/A"}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(bill.grandTotal)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleViewDetails(bill)}
                      title="View Details"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      onClick={() => handleReprint(bill)}
                      title="Reprint"
                    >
                      <Print />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bill Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bill Details - {selectedBill?.billNumber}</DialogTitle>
        <DialogContent>
          {selectedBill && (
            <Box>
              <Box className="bill-info">
                <Typography>
                  <strong>Date:</strong> {selectedBill.date}
                </Typography>
                <Typography>
                  <strong>Customer Name:</strong>{" "}
                  {selectedBill.customerName || "N/A"}
                </Typography>
                <Typography>
                  <strong>Mobile:</strong> {selectedBill.mobileNumber || "N/A"}
                </Typography>
                {selectedBill.address && (
                  <Typography>
                    <strong>Address:</strong> {selectedBill.address}
                  </Typography>
                )}
                {selectedBill.gstin && (
                  <Typography>
                    <strong>GSTIN:</strong> {selectedBill.gstin}
                  </Typography>
                )}
              </Box>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Items
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Description</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Purity</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Gross Wt.</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Net Wt.</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Rate</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Gold Value</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Making</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Other</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Old Gold</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Total</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...selectedBill.billItems]
                      .sort((a, b) => {
                        const aIsOld = a.hsnCode === "OLD";
                        const bIsOld = b.hsnCode === "OLD";
                        if (aIsOld && !bIsOld) return 1;
                        if (!aIsOld && bIsOld) return -1;
                        return 0;
                      })
                      .map((item, index) => {
                        const isOldGold =
                          item.hsnCode === "OLD" && item.oldGoldValue > 0;
                        return (
                          <TableRow
                            key={index}
                            sx={{
                              bgcolor: isOldGold
                                ? (theme) =>
                                    theme.palette.mode === "dark"
                                      ? "rgba(212, 112, 29, 0.15)"
                                      : "#fff5e6"
                                : "inherit",
                              "&:hover": {
                                bgcolor: isOldGold
                                  ? (theme) =>
                                      theme.palette.mode === "dark"
                                        ? "rgba(212, 112, 29, 0.25)"
                                        : "#ffe8cc"
                                  : undefined,
                              },
                            }}
                          >
                            <TableCell
                              sx={{
                                color: isOldGold ? "#d4701d" : "inherit",
                                fontWeight: isOldGold ? 600 : "normal",
                              }}
                            >
                              {item.itemDescription}
                            </TableCell>
                            <TableCell
                              sx={{ color: isOldGold ? "#d4701d" : "inherit" }}
                            >
                              {item.purity || "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: isOldGold ? "#d4701d" : "inherit" }}
                            >
                              {item.grossWeight
                                ? `${parseFloat(item.grossWeight).toFixed(3)}g`
                                : "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: isOldGold ? "#d4701d" : "inherit" }}
                            >
                              {item.netGoldWeight
                                ? `${parseFloat(item.netGoldWeight).toFixed(3)}g`
                                : "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: isOldGold ? "#d4701d" : "inherit" }}
                            >
                              {item.goldRatePerGram
                                ? formatCurrency(item.goldRatePerGram)
                                : "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: isOldGold ? "#d4701d" : "inherit" }}
                            >
                              {item.goldValue
                                ? formatCurrency(item.goldValue)
                                : "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: isOldGold ? "#d4701d" : "inherit" }}
                            >
                              {item.makingCharge
                                ? formatCurrency(item.makingCharge)
                                : "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: isOldGold ? "#d4701d" : "inherit" }}
                            >
                              {item.otherCharges
                                ? formatCurrency(item.otherCharges)
                                : "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: "#d4701d",
                                fontWeight: isOldGold ? "bold" : "normal",
                              }}
                            >
                              {item.oldGoldValue
                                ? `-${formatCurrency(item.oldGoldValue)}`
                                : "-"}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: "bold",
                                color: isOldGold ? "#d4701d" : "inherit",
                              }}
                            >
                              {isOldGold
                                ? `-${formatCurrency(item.oldGoldValue || 0)}`
                                : formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box className="bill-totals" sx={{ mt: 3 }}>
                <Typography>
                  <strong>Gold Value (Subtotal):</strong>{" "}
                  {formatCurrency(selectedBill.subtotal)}
                </Typography>
                {(() => {
                  const totalMaking = selectedBill.billItems.reduce(
                    (sum, item) => sum + (item.makingCharge || 0),
                    0,
                  );
                  return totalMaking > 0 ? (
                    <Typography>
                      <strong>Making Charges:</strong>{" "}
                      {formatCurrency(totalMaking)}
                    </Typography>
                  ) : null;
                })()}
                {(() => {
                  const totalOther = selectedBill.billItems.reduce(
                    (sum, item) => sum + (item.otherCharges || 0),
                    0,
                  );
                  return totalOther > 0 ? (
                    <Typography>
                      <strong>Other Charges:</strong>{" "}
                      {formatCurrency(totalOther)}
                    </Typography>
                  ) : null;
                })()}
                {(() => {
                  const totalOld = selectedBill.billItems.reduce(
                    (sum, item) => sum + (item.oldGoldValue || 0),
                    0,
                  );
                  return totalOld > 0 ? (
                    <Typography sx={{ color: "#d4701d", fontWeight: "bold" }}>
                      <strong>Less: Old Gold Value:</strong> -
                      {formatCurrency(totalOld)}
                    </Typography>
                  ) : null;
                })()}
                {(() => {
                  const totalMaking = selectedBill.billItems.reduce(
                    (sum, item) => sum + (item.makingCharge || 0),
                    0,
                  );
                  const totalOther = selectedBill.billItems.reduce(
                    (sum, item) => sum + (item.otherCharges || 0),
                    0,
                  );
                  const totalOld = selectedBill.billItems.reduce(
                    (sum, item) => sum + (item.oldGoldValue || 0),
                    0,
                  );
                  const taxableAmount =
                    selectedBill.subtotal + totalMaking + totalOther - totalOld;
                  return (
                    <Typography
                      sx={{ mt: 1, pt: 1, borderTop: "1px solid #ddd" }}
                    >
                      <strong>Taxable Amount:</strong>{" "}
                      {formatCurrency(taxableAmount)}
                    </Typography>
                  );
                })()}
                <Typography>
                  <strong>CGST:</strong>{" "}
                  {formatCurrency(selectedBill.totalGst / 2)}
                </Typography>
                <Typography>
                  <strong>SGST:</strong>{" "}
                  {formatCurrency(selectedBill.totalGst / 2)}
                </Typography>
                {selectedBill.roundOff &&
                  Math.abs(selectedBill.roundOff) > 0.001 && (
                    <Typography>
                      <strong>Round Off:</strong>{" "}
                      {formatCurrency(selectedBill.roundOff)}
                    </Typography>
                  )}
                <Typography
                  variant="h6"
                  sx={{ mt: 1, pt: 1, borderTop: "2px solid #333" }}
                >
                  <strong>Grand Total:</strong>{" "}
                  {formatCurrency(selectedBill.grandTotal)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => handleReprint(selectedBill)}
            color="primary"
            startIcon={<Print />}
          >
            Print
          </Button>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Sales;
