import React, { useState } from "react";
import { creditService } from "../services/creditService";

const CreditPaymentForm = ({ creditId, remainingAmount, onSuccess }) => {
  const [formData, setFormData] = useState({
    amountPaid: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMode: "CASH",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const amountValue = parseFloat(formData.amountPaid);

      if (!amountValue || amountValue <= 0) {
        setError("Please enter a valid amount");
        setLoading(false);
        return;
      }

      if (amountValue > remainingAmount) {
        setError(
          `Amount cannot exceed remaining balance of ₹${remainingAmount}`
        );
        setLoading(false);
        return;
      }

      const paymentData = {
        amountPaid: amountValue,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        remarks: formData.remarks,
      };

      const result = await creditService.addPayment(creditId, paymentData);
      setSuccess(
        `Payment recorded successfully! Remaining balance: ₹${result.credit.remainingAmount}`
      );
      setFormData({
        amountPaid: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMode: "CASH",
        remarks: "",
      });
      onSuccess(result.credit);
    } catch (err) {
      setError(err.message || "Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-form-container">
      <h4>Record Payment</h4>
      <div className="remaining-balance">
        <strong>Remaining Balance: ₹{remainingAmount.toFixed(2)}</strong>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="amountPaid">
            Amount Paid <span className="required">*</span>
          </label>
          <input
            type="number"
            id="amountPaid"
            name="amountPaid"
            value={formData.amountPaid}
            onChange={handleChange}
            placeholder="Enter amount to pay"
            step="0.01"
            min="0"
            max={remainingAmount}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="paymentDate">
            Payment Date <span className="required">*</span>
          </label>
          <input
            type="date"
            id="paymentDate"
            name="paymentDate"
            value={formData.paymentDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="paymentMode">Payment Mode</label>
          <select
            id="paymentMode"
            name="paymentMode"
            value={formData.paymentMode}
            onChange={handleChange}
          >
            <option value="CASH">Cash</option>
            <option value="CHECK">Check</option>
            <option value="ONLINE">Online Transfer</option>
            <option value="CARD">Card</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="remarks">Remarks</label>
          <textarea
            id="remarks"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            placeholder="Additional notes about this payment"
            rows="2"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-success">
          {loading ? "Recording..." : "Record Payment"}
        </button>
      </form>
    </div>
  );
};

export default CreditPaymentForm;
