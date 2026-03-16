import React, { useState, useEffect } from "react";
import { creditService } from "../services/creditService";
import CreditForm from "../components/CreditForm";
import "../pages/Credits.css";

const Credits = () => {
  const [credits, setCredits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCredits();
    fetchCustomers();
  }, [statusFilter]);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      let data;
      if (statusFilter === "ALL") {
        data = await creditService.getAllCredits();
      } else {
        data = await creditService.getCreditsByStatus(statusFilter);
      }
      setCredits(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to fetch credits");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const handleCreditCreated = (newCredit) => {
    setCredits((prev) => [newCredit, ...prev]);
    setActiveTab("list");
  };

  const filteredCredits = credits.filter((credit) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      credit.customer?.name.toLowerCase().includes(searchLower) ||
      credit.customer?.mobileNumber?.includes(searchLower) ||
      credit.id.toString().includes(searchLower)
    );
  });

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
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "500",
        }}
      >
        {style.label}
      </span>
    );
  };

  const isOverdue = (recordDate) => {
    return new Date(recordDate) < new Date();
  };

  return (
    <div className="credits-container">
      <div className="credits-header">
        <h1>Credit Management</h1>
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
            onClick={() => setActiveTab("list")}
          >
            View Credits
          </button>
          <button
            className={`tab-btn ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            Create Credit
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {activeTab === "create" && (
        <div className="credits-content">
          <CreditForm onSuccess={handleCreditCreated} customers={customers} />
        </div>
      )}

      {activeTab === "list" && (
        <div className="credits-content">
          <div className="filters-section">
            <div className="filter-group">
              <label htmlFor="statusFilter">Filter by Status:</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Credits</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial Paid</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="filter-group">
              <input
                type="text"
                placeholder="Search by customer name or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading credits...</div>
          ) : filteredCredits.length === 0 ? (
            <div className="no-data">
              No credits found. Create a new one to get started!
            </div>
          ) : (
            <div className="credits-table-wrapper">
              <table className="credits-table">
                <thead>
                  <tr>
                    <th>Credit ID</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Credit Amount</th>
                    <th>Remaining</th>
                    <th>Committed Date</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCredits.map((credit) => (
                    <tr
                      key={credit.id}
                      className={`credit-row ${
                        isOverdue(credit.committedPaymentDate) &&
                        credit.paymentStatus !== "COMPLETED"
                          ? "overdue"
                          : ""
                      }`}
                    >
                      <td className="credit-id">#{credit.id}</td>
                      <td>{credit.customer?.name || "N/A"}</td>
                      <td>{credit.customer?.mobileNumber || "N/A"}</td>
                      <td>₹{credit.creditAmount.toFixed(2)}</td>
                      <td className="remaining-amount">
                        ₹{credit.remainingAmount.toFixed(2)}
                      </td>
                      <td>
                        {credit.committedPaymentDate}
                        {isOverdue(credit.committedPaymentDate) &&
                          credit.paymentStatus !== "COMPLETED" && (
                            <span className="overdue-label"> (Overdue)</span>
                          )}
                      </td>
                      <td>{getStatusBadge(credit.paymentStatus)}</td>
                      <td title={credit.itemDescription}>
                        {credit.itemDescription || "-"}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-view"
                          onClick={() =>
                            window.location.href = `/credit-details/${credit.id}`
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Credits;
