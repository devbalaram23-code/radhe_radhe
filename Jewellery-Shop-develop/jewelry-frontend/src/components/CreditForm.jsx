import React, { useState, useEffect } from "react";
import { creditService, billService } from "../services/creditService";
import BillPreview from "./BillPreview";

const CreditForm = ({ onSuccess, customers }) => {
  const [formData, setFormData] = useState({
    customerId: "",
    billId: "",
    creditAmount: "",
    committedPaymentDate: "",
    itemDescription: "",
    notes: "",
  });
  const [customerBills, setCustomerBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Fetch bills when customer is selected
    if (name === "customerId" && value) {
      fetchCustomerBills(value);
    }
  };

  const fetchCustomerBills = async (customerId) => {
    try {
      setLoadingBills(true);
      const bills = await billService.getCustomerBills(customerId);
      setCustomerBills(bills);
      setFormData((prev) => ({
        ...prev,
        billId: "",
      }));
      setSelectedBill(null);
      setError("");
    } catch (err) {
      console.error("Error fetching bills:", err);
      setCustomerBills([]);
    } finally {
      setLoadingBills(false);
    }
  };

  const handleBillSelection = async (billId) => {
    const bill = customerBills.find((b) => b.id === parseInt(billId));
    if (bill) {
      try {
        // Check if a credit already exists for this bill
        const allCredits = await creditService.getAllCredits();
        const existingCredit = allCredits.find((c) => c.billId === bill.id);
        
        if (existingCredit) {
          setError(`⚠️ A credit already exists for this bill (Credit ID: ${existingCredit.id}). You cannot create multiple credits for the same bill.`);
          setSelectedBill(null);
          return;
        }

        setError(""); // Clear error if bill is valid
        setFormData((prev) => ({
          ...prev,
          billId,
          creditAmount: bill.grandTotal.toString(),
          itemDescription: bill.billItems
            .map((item) => item.itemDescription)
            .join(", "),
        }));
        setSelectedBill(bill);
      } catch (err) {
        console.error("Error checking existing credits:", err);
        // Allow selection even if check fails, to not block the user
        setFormData((prev) => ({
          ...prev,
          billId,
          creditAmount: bill.grandTotal.toString(),
          itemDescription: bill.billItems
            .map((item) => item.itemDescription)
            .join(", "),
        }));
        setSelectedBill(bill);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (
        !formData.customerId ||
        !formData.creditAmount ||
        !formData.committedPaymentDate
      ) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      // Double-check: if bill is selected, verify no credit exists for it
      if (formData.billId) {
        const allCredits = await creditService.getAllCredits();
        const existingCredit = allCredits.find((c) => c.billId === parseInt(formData.billId));
        
        if (existingCredit) {
          setError(`❌ Cannot create credit! A credit already exists for this bill (Credit ID: ${existingCredit.id})`);
          setLoading(false);
          return;
        }
      }

      const creditData = {
        customerId: parseInt(formData.customerId),
        creditAmount: parseFloat(formData.creditAmount),
        committedPaymentDate: formData.committedPaymentDate,
        ...(formData.billId && { billId: parseInt(formData.billId) }),
        itemDescription: formData.itemDescription,
        notes: formData.notes,
      };

      const result = await creditService.createCredit(creditData);
      setSuccess(`Credit created successfully! Credit ID: ${result.id}`);
      setFormData({
        customerId: "",
        billId: "",
        creditAmount: "",
        committedPaymentDate: "",
        itemDescription: "",
        notes: "",
      });
      setCustomerBills([]);
      setSelectedBill(null);
      onSuccess(result);
    } catch (err) {
      setError(err.message || "Failed to create credit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="credit-form-container">
      <h3>Create New Credit Record</h3>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="customerId">
            Customer <span className="required">*</span>
          </label>
          <select
            id="customerId"
            name="customerId"
            value={formData.customerId}
            onChange={handleChange}
            required
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} - {customer.mobileNumber}
              </option>
            ))}
          </select>
        </div>

        {/* Bills Section */}
        {customerBills.length > 0 && (
          <div className="bills-section">
            <h4>📋 Customer Bills</h4>
            {loadingBills && <div className="loading-text">Loading bills...</div>}
            {!loadingBills && (
              <div className="bills-list">
                {customerBills.map((bill) => (
                  <div
                    key={bill.id}
                    className={`bill-card ${
                      formData.billId === bill.id.toString() ? "selected" : ""
                    }`}
                    onClick={() => handleBillSelection(bill.id.toString())}
                  >
                    <div className="bill-card-header">
                      <span className="bill-number">{bill.billNumber}</span>
                      <span className="bill-date">{bill.date}</span>
                    </div>
                    <div className="bill-card-body">
                      <div className="bill-detail">
                        <span className="label">Amount:</span>
                        <span className="amount">
                          ₹{bill.grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="bill-detail">
                        <span className="label">Items:</span>
                        <span className="count">{bill.billItems.length}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-view"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBill(bill);
                        setShowBillPreview(true);
                      }}
                    >
                      View PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedBill && (
          <div className="selected-bill-info">
            <strong>✓ Selected Bill: {selectedBill.billNumber}</strong>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  billId: "",
                }));
                setSelectedBill(null);
              }}
            >
              Clear Selection
            </button>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="creditAmount">
            Credit Amount <span className="required">*</span>
          </label>
          <input
            type="number"
            id="creditAmount"
            name="creditAmount"
            value={formData.creditAmount}
            onChange={handleChange}
            placeholder="Enter credit amount"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="committedPaymentDate">
            Committed Payment Date <span className="required">*</span>
          </label>
          <input
            type="date"
            id="committedPaymentDate"
            name="committedPaymentDate"
            value={formData.committedPaymentDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="itemDescription">Item Description</label>
          <input
            type="text"
            id="itemDescription"
            name="itemDescription"
            value={formData.itemDescription}
            onChange={handleChange}
            placeholder="e.g., Gold necklace, Diamond ring, etc."
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes or remarks"
            rows="3"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Creating..." : "Create Credit"}
        </button>
      </form>

      {showBillPreview && selectedBill && (
        <BillPreview
          bill={selectedBill}
          onClose={() => setShowBillPreview(false)}
        />
      )}
    </div>
  );
};

export default CreditForm;
