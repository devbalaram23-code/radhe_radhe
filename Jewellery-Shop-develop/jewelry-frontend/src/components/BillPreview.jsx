import React from "react";

const BillPreview = ({ bill, onClose }) => {

  const downloadPDF = async () => {
    if (!bill.pdfData) {
      alert("PDF not available for this bill");
      return;
    }

    // Convert base64 to blob if needed
    const pdfData = bill.pdfData.data || bill.pdfData;
    const blob = new Blob([new Uint8Array(pdfData)], {
      type: bill.pdfMime || "application/pdf",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = bill.pdfFilename || `bill_${bill.billNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="bill-preview-overlay">
      <div className="bill-preview-modal">
        <div className="bill-preview-header">
          <h3>Bill Preview - {bill.billNumber}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="bill-preview-content">
          <div className="bill-info-grid">
            <div className="info-item">
              <label>Bill Number:</label>
              <span>{bill.billNumber}</span>
            </div>
            <div className="info-item">
              <label>Date:</label>
              <span>{bill.date}</span>
            </div>
            <div className="info-item">
              <label>Customer Name:</label>
              <span>{bill.customerName || "N/A"}</span>
            </div>
            <div className="info-item">
              <label>Mobile:</label>
              <span>{bill.mobileNumber || "N/A"}</span>
            </div>
            <div className="info-item">
              <label>Total Amount:</label>
              <span className="amount">₹{bill.grandTotal.toFixed(2)}</span>
            </div>
            <div className="info-item">
              <label>Advance Applied:</label>
              <span>₹{bill.advanceApplied.toFixed(2)}</span>
            </div>
          </div>

          {bill.billItems && bill.billItems.length > 0 && (
            <div className="bill-items-section">
              <h4>Bill Items</h4>
              <div className="items-table-wrapper">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>HSN</th>
                      <th>Net Weight</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.billItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.itemDescription}</td>
                        <td>{item.hsnCode || "-"}</td>
                        <td>{item.netGoldWeight || "-"}</td>
                        <td>
                          ₹{item.goldRatePerGram?.toFixed(2) || "-"}
                        </td>
                        <td>₹{item.total?.toFixed(2) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {bill.pdfData && (
            <div className="bill-pdf-section">
              <button className="btn btn-primary" onClick={downloadPDF}>
                📥 Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillPreview;
