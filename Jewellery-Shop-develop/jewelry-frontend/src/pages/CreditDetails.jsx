import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { creditService } from "../services/creditService";
import CreditPaymentForm from "../components/CreditPaymentForm";
import "../pages/CreditDetails.css";

const CreditDetails = () => {
  const { creditId } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    fetchCreditDetails();
  }, [creditId]);

  const fetchCreditDetails = async () => {
    try {
      setLoading(true);
      const data = await creditService.getCreditById(creditId);
      setCredit(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to fetch credit details");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (updatedCredit) => {
    setCredit(updatedCredit);
    setShowPaymentForm(false);
  };

  if (loading) {
    return <div className="credit-details-container loading">Loading...</div>;
  }

  if (error || !credit) {
    return (
      <div className="credit-details-container">
        <div className="alert alert-error">{error || "Credit not found"}</div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/credits")}
        >
          Back to Credits
        </button>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { bg: "#fee2e2", text: "#991b1b", label: "Pending" },
      PARTIAL: { bg: "#fef3c7", text: "#92400e", label: "Partial Paid" },
      COMPLETED: { bg: "#dcfce7", text: "#166534", label: "Completed" },
    };
    const style = statusMap[status] || statusMap.PENDING;
    return (
      <span
        style={{
          backgroundColor: style.bg,
          color: style.text,
          padding: "6px 12px",
          borderRadius: "4px",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        {style.label}
      </span>
    );
  };

  const isOverdue =
    new Date(credit.committedPaymentDate) < new Date() &&
    credit.paymentStatus !== "COMPLETED";

  const paidAmount = credit.creditAmount - credit.remainingAmount;
  const percentagePaid = (paidAmount / credit.creditAmount) * 100;

  return (
    <div className="credit-details-container">
      <div className="details-header">
        <button
          className="btn btn-back"
          onClick={() => navigate("/credits")}
        >
          ← Back to Credits
        </button>
        <h1>Credit Details - #{credit.id}</h1>
        {getStatusBadge(credit.paymentStatus)}
      </div>

      <div className="details-grid">
        {/* Customer Info Card */}
        <div className="info-card">
          <h3>Customer Information</h3>
          <div className="info-row">
            <span className="label">Name:</span>
            <span className="value">{credit.customer?.name || "N/A"}</span>
          </div>
          <div className="info-row">
            <span className="label">Mobile:</span>
            <span className="value">
              {credit.customer?.mobileNumber || "N/A"}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Address:</span>
            <span className="value">
              {credit.customer?.address || "Not provided"}
            </span>
          </div>
          <div className="info-row">
            <span className="label">GSTIN:</span>
            <span className="value">
              {credit.customer?.gstin || "Not provided"}
            </span>
          </div>
        </div>

        {/* Credit Amount Info Card */}
        <div className="info-card amount-card">
          <h3>Credit Amount</h3>
          <div className="amount-display">
            <div className="amount-item">
              <span className="label">Total Credit:</span>
              <span className="amount">₹{credit.creditAmount.toFixed(2)}</span>
            </div>
            <div className="amount-item">
              <span className="label">Paid Amount:</span>
              <span className="amount paid">₹{paidAmount.toFixed(2)}</span>
            </div>
            <div className="amount-item">
              <span className="label">Remaining Amount:</span>
              <span className="amount remaining">
                ₹{credit.remainingAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-label">
              Payment Progress: {percentagePaid.toFixed(1)}%
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(percentagePaid, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Credit Details Card */}
        <div className="info-card">
          <h3>Credit Details</h3>
          {credit.bill && (
            <div className="info-row">
              <span className="label">Bill Number:</span>
              <span className="value bill-number">
                {credit.bill.billNumber}
              </span>
            </div>
          )}
          <div className="info-row">
            <span className="label">Item Description:</span>
            <span className="value">
              {credit.itemDescription || "Not specified"}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Committed Payment Date:</span>
            <span className={`value ${isOverdue ? "overdue" : ""}`}>
              {credit.committedPaymentDate}
              {isOverdue && <span className="overdue-flag"> (Overdue)</span>}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Created Date:</span>
            <span className="value">
              {new Date(credit.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Notes:</span>
            <span className="value">
              {credit.notes || "No additional notes"}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Recording Section */}
      {credit.paymentStatus !== "COMPLETED" && (
        <div className="payment-section">
          {!showPaymentForm ? (
            <button
              className="btn btn-success"
              onClick={() => setShowPaymentForm(true)}
            >
              + Record Payment
            </button>
          ) : (
            <>
              <CreditPaymentForm
                creditId={credit.id}
                remainingAmount={credit.remainingAmount}
                onSuccess={handlePaymentSuccess}
              />
              <button
                className="btn btn-secondary"
                onClick={() => setShowPaymentForm(false)}
                style={{ marginTop: "10px" }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* Payment History */}
      <div className="payment-history">
        <h3>Payment History</h3>
        {credit.payments && credit.payments.length > 0 ? (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount Paid</th>
                  <th>Payment Date</th>
                  <th>Payment Mode</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {credit.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>#{payment.id}</td>
                    <td className="amount">₹{payment.amountPaid.toFixed(2)}</td>
                    <td>{payment.paymentDate}</td>
                    <td>{payment.paymentMode || "N/A"}</td>
                    <td>{payment.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-payments">
            No payments recorded yet for this credit.
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditDetails;
