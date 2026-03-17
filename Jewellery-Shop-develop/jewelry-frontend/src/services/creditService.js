const API_BASE_URL = `${process.env.REACT_APP_API_BASE || "http://localhost:8080"}/api`;

export const creditService = {
  // Create a new credit record
  createCredit: async (creditData) => {
    const response = await fetch(`${API_BASE_URL}/credits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(creditData),
    });
    if (!response.ok) throw new Error("Failed to create credit");
    return await response.json();
  },

  // Get all credits
  getAllCredits: async () => {
    const response = await fetch(`${API_BASE_URL}/credits`);
    if (!response.ok) throw new Error("Failed to fetch credits");
    return await response.json();
  },

  // Get credits by status (PENDING, PARTIAL, COMPLETED)
  getCreditsByStatus: async (status) => {
    const response = await fetch(`${API_BASE_URL}/credits/status/${status}`);
    if (!response.ok) throw new Error("Failed to fetch credits by status");
    return await response.json();
  },

  // Get credits for a specific customer
  getCustomerCredits: async (customerId) => {
    const response = await fetch(
      `${API_BASE_URL}/credits/customer/${customerId}`
    );
    if (!response.ok) throw new Error("Failed to fetch customer credits");
    return await response.json();
  },

  // Get a specific credit record
  getCreditById: async (creditId) => {
    const response = await fetch(`${API_BASE_URL}/credits/${creditId}`);
    if (!response.ok) throw new Error("Failed to fetch credit");
    return await response.json();
  },

  // Update credit record
  updateCredit: async (creditId, updateData) => {
    const response = await fetch(`${API_BASE_URL}/credits/${creditId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error("Failed to update credit");
    return await response.json();
  },

  // Add payment to credit
  addPayment: async (creditId, paymentData) => {
    const response = await fetch(`${API_BASE_URL}/credits/${creditId}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });
    if (!response.ok) throw new Error("Failed to add payment");
    return await response.json();
  },

  // Get dashboard summary
  getDashboardSummary: async () => {
    const response = await fetch(`${API_BASE_URL}/credits/dashboard/summary`);
    if (!response.ok) throw new Error("Failed to fetch dashboard summary");
    return await response.json();
  },
};

export const billService = {
  // Get bills for a specific customer
  getCustomerBills: async (customerId) => {
    const response = await fetch(
      `${API_BASE_URL}/bills/customer/${customerId}`
    );
    if (!response.ok) throw new Error("Failed to fetch customer bills");
    return await response.json();
  },

  // Get a specific bill
  getBillById: async (billId) => {
    const response = await fetch(`${API_BASE_URL}/bills/${billId}`);
    if (!response.ok) throw new Error("Failed to fetch bill");
    return await response.json();
  },

  // Get bill PDF
  getBillPDF: async (billId) => {
    const response = await fetch(`${API_BASE_URL}/bills/${billId}/pdf`);
    if (!response.ok) throw new Error("Failed to fetch bill PDF");
    return await response.blob();
  },
};
