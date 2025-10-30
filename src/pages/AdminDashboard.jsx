import React, { useState, useEffect } from "react";
import { createUser, getUsers, getAllTransactions } from "../api/api";
import { Search } from "lucide-react";

const API_BASE = "http://192.168.1.224/DCHO-docutrack-api/api";

export default function AdminDashboard({ user, onLogout }) {
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("transactions");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [completedTransactions, setCompletedTransactions] = useState([]);
  const [failedTransactions, setFailedTransactions] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [transactionLogs, setTransactionLogs] = useState({});
  const [expandedTransaction, setExpandedTransaction] = useState(null);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [selectedTrackingNo, setSelectedTrackingNo] = useState("");
  const [showEditTransactionModal, setShowEditTransactionModal] =
    useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [logDetails, setLogDetails] = useState({
    action_taken: "",
    remarks: "",
    date_time_received: "",
    received_by: user?.full_name || "",
  });

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "user",
  });

  const [transactionData, setTransactionData] = useState({
    date_indorsement: "",
    datetime_receive: "",
    sender_name: "",
    organization: "",
    document_type: "CRMS LETTER",
    scanned_file: "",
    document_name: "",
    forwarded_to: "",
    remarks: "",
    status: "ONGOING",
  });

  // 🔹 Load users and transactions
  useEffect(() => {
    loadUsers();
    loadTransactions();
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/get_transactions.php?role=${user.role}&username=${user.username}`
        );
        const data = await res.json();

        if (data.success) {
          setTransactions(data.transactions || []);
          setCompletedTransactions(data.completed || []);
          setFailedTransactions(data.failed || []);
        } else {
          console.error("Error fetching:", data.message);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    fetchTransactions();
  }, [user]);

  // Derived state: only show ongoing
  const ongoingTransactions = transactions.filter(
    (t) =>
      t.status.toLowerCase() !== "completed" &&
      t.status.toLowerCase() !== "failed"
  );

  // Select which to display based on active filter
  let displayedTransactions = [];
  if (activeStatus === "all") displayedTransactions = transactions;
  if (activeStatus === "completed")
    displayedTransactions = completedTransactions;
  if (activeStatus === "failed") displayedTransactions = failedTransactions;

  async function loadUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  }

  async function loadTransactions() {
    try {
      const username = user?.username || "";
      const role = user?.role ? user.role.toLowerCase() : "user";

      console.log("Fetching transactions for:", username, "as", role);

      const res = await fetch(
        `${API_BASE}/get_transactions.php?username=${encodeURIComponent(
          username
        )}&role=${encodeURIComponent(role)}`
      );

      const data = await res.json();
      console.log("Transactions response:", data);

      if (data.success) {
        setTransactions(data.transactions);
      } else {
        console.warn("Failed to load transactions:", data.message);
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    if (onLogout) onLogout();
  }

  // 🔹 Toggle Transaction Logs
  async function toggleLogs(tracking_no) {
    if (expandedTransaction === tracking_no) {
      setExpandedTransaction(null);
      return;
    }

    setExpandedTransaction(tracking_no);

    if (!transactionLogs[tracking_no]) {
      try {
        const res = await fetch(
          `${API_BASE}/get_logs.php?tracking_no=${tracking_no}`
        );
        const data = await res.json();
        if (data.success) {
          setTransactionLogs((prev) => ({
            ...prev,
            [tracking_no]: data.logs,
          }));
        } else {
          setTransactionLogs((prev) => ({
            ...prev,
            [tracking_no]: [],
          }));
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
      }
    }
  }

  const handleOpenEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setShowEditTransactionModal(true);
  };

  const handleOpenAddLog = (trackingNo) => {
    setSelectedTrackingNo(trackingNo);
    setLogDetails({
      action_taken: "",
      remarks: "",
      date_time_received: "",
      received_by: user?.full_name || "",
    });
    setShowAddLogModal(true);
  };

  const handleCloseModal2 = () => setShowAddLogModal(false);

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    const newLog = {
      tracking_no: selectedTrackingNo,
      ...logDetails,
    };

    try {
      const res = await fetch(`${API_BASE}/add_log.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });

      const data = await res.json();

      if (data.success) {
        alert("Log added successfully!");
        const logsRes = await fetch(
          `${API_BASE}/get_logs.php?tracking_no=${selectedTrackingNo}`
        );
        const logsData = await logsRes.json();
        if (logsData.success) {
          setTransactionLogs((prev) => ({
            ...prev,
            [selectedTrackingNo]: logsData.logs,
          }));
        }
        setShowAddLogModal(false);
      } else {
        alert("Failed to add log.");
      }
    } catch (error) {
      console.error("Error adding log:", error);
      alert("Error adding log.");
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      const result = await createUser(formData);
      setMessage(result.message);
      setFormData({ full_name: "", username: "", password: "", role: "user" });
      setShowUserModal(false);
      await loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleTransactionSubmit(e) {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE}/transactions.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData),
      });

      const data = await res.json();

      if (data.success) {
        alert(
          `✅ Transaction created successfully!\nTracking No: ${data.tracking_no}`
        );
        setShowTransactionModal(false);
        setTransactionData({
          date_indorsement: "",
          datetime_receive: "",
          sender_name: "",
          organization: "",
          document_type: "CRMS LETTER",
          scanned_file: "",
          document_name: "",
          forwarded_to: "",
          remarks: "",
          status: "ONGOING",
        });
        loadTransactions();
      } else {
        // 🟠 Handle duplicate or other specific messages
        if (data.message && data.message.includes("Duplicate entry")) {
          alert(
            "⚠️ Duplicate detected!\nThis sender already has a transaction with the same document name."
          );
        } else {
          alert(
            "❌ Error: " +
              (data.message || data.error || "Unknown error occurred.")
          );
        }
      }
    } catch (err) {
      console.error("Transaction submit error:", err);
      alert("🚫 Network or server error while submitting transaction.");
    }
  }

  async function handleEditTransactionSubmit(e, tracking_no) {
    e.preventDefault();

    try {
      // Find the old transaction before editing (from your loaded transactions list)
      const oldTransaction = transactions.find(
        (t) => t.tracking_no === tracking_no
      );

      // Step 1: Update the transaction
      const res = await fetch(`${API_BASE}/update_transaction.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTransaction),
      });

      const data = await res.json();

      if (data.success) {
        alert("Transaction updated successfully!");

        // Step 2: Identify only changed fields
        const changedFields = Object.keys(editingTransaction)
          .filter((key) => key !== "tracking_no") // skip tracking number
          .filter((key) => editingTransaction[key] !== oldTransaction[key]) // only changed ones
          .map(
            (key) =>
              `${key}: "${oldTransaction[key]}" → "${editingTransaction[key]}"`
          );

        // Step 3: Add a log entry only if something changed
        if (changedFields.length > 0) {
          await fetch(`${API_BASE}/add_log.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tracking_no: tracking_no,
              remarks: "Transaction updated by admin",
              action_taken: `Updated fields — ${changedFields.join(", ")}`,
              date_time_received: new Date()
                .toISOString()
                .slice(0, 19)
                .replace("T", " "),
              received_by: user?.username || "Admin",
            }),
          });
        }

        setShowEditTransactionModal(false);
        loadTransactions(); // refresh data
      } else {
        alert(
          "Failed to update transaction: " + (data.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Error updating transaction.");
    }
  }

  const filteredTransactions = ongoingTransactions.filter((t) => {
    const keyword = searchTerm.toLowerCase();
    return (
      t.tracking_no?.toLowerCase().includes(keyword) ||
      t.sender_name?.toLowerCase().includes(keyword) ||
      t.document_name?.toLowerCase().includes(keyword)
    );
  });

  const filteredHistory = displayedTransactions.filter((t) => {
  const term = historySearchTerm.toLowerCase();
  return (
    t.tracking_no?.toLowerCase().includes(term) ||
    t.sender_name?.toLowerCase().includes(term) ||
    t.document_name?.toLowerCase().includes(term)
  );
});

  return (
    <div className="min-h-screen bg-blue-950 text-gray-200 p-8">
      {/* Header */}
      <header className="bg-[#1b1b1d] rounded-2xl p-6 mb-8 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, {user?.full_name || "Admin"}
          </h1>
          <p className="text-gray-400">
            Role:{" "}
            <span className="text-yellow-400">{user?.role || "admin"}</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
        >
          Logout
        </button>
      </header>
      {/* Tabs */}
      <div className="bg-[#1b1b1d] p-6 rounded-2xl shadow-xl">
        <div className="flex space-x-8 border-b border-gray-700 mb-6">
          {[
            { id: "transactions", label: "TRANSACTIONS" },
            { id: "history", label: "TRANSACTION HISTORY" },
            { id: "users", label: "USER MANAGEMENT" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "text-yellow-400 border-b-2 border-yellow-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- History Tab --- */}
        {activeTab === "history" && (
          <main className="bg-[#2a2a2e] p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">
                Transaction History
              </h2>

              {/* 🔍 Search Bar */}
              <input
                type="text"
                placeholder="Search by Tracking No, Sender, or Document Name..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="px-3 py-2 rounded-md bg-[#1b1b1d] text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600 w-80"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setActiveStatus("completed")}
                className={`px-3 py-1 rounded-md text-sm ${
                  activeStatus === "completed"
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setActiveStatus("failed")}
                className={`px-3 py-1 rounded-md text-sm ${
                  activeStatus === "failed"
                    ? "bg-red-600 text-white"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                Failed
              </button>
            </div>

            {/* Table */}
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#1b1b1d] text-gray-300">
                <tr className="text-sm">
                  <th className="p-3 border border-gray-700">Tracking No</th>
                  <th className="p-3 border border-gray-700">
                    Date Endorsement
                  </th>
                  <th className="p-3 border border-gray-700">
                    Date & Time Received
                  </th>
                  <th className="p-3 border border-gray-700">Sender</th>
                  <th className="p-3 border border-gray-700">Doc Type</th>
                  <th className="p-3 border border-gray-700">Document Name</th>
                  <th className="p-3 border border-gray-700">File</th>
                  <th className="p-3 border border-gray-700">Forwarded To</th>
                  <th className="p-3 border border-gray-700">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((t) => (
                    <React.Fragment key={t.tracking_no}>
                      <tr
                        className="hover:bg-[#3a3a3f] cursor-pointer"
                        onClick={() => toggleLogs(t.tracking_no)}
                      >
                        <td className="p-3 border border-gray-700">
                          {t.tracking_no}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.date_indorsement}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.datetime_receive}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.sender_name}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.document_type}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.document_name}
                        </td>
                        <td className="p-3 border border-gray-700 text-yellow-400 underline">
                          <a
                            href={t.scanned_file}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.forwarded_to}
                        </td>
                        <td className="p-3 border border-gray-700 capitalize justify-between flex items-center">
                          <span
                            className={`px-2 py-1 rounded-md text-xs ${
                              t.status === "completed"
                                ? "bg-green-700 text-white"
                                : t.status === "failed"
                                ? "bg-red-700 text-white"
                                : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {t.status}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditTransaction(t);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded-md ml-2"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Logs */}
                      {expandedTransaction === t.tracking_no && (
                        <tr>
                          <td
                            colSpan="9"
                            className="bg-[#1f1f21] border border-gray-700 p-4"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="font-semibold text-yellow-400">
                                Transaction Logs for {t.tracking_no}
                              </h3>
                              <button
                                onClick={() => handleOpenAddLog(t.tracking_no)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md transition"
                              >
                                + Add Log
                              </button>
                            </div>

                            {transactionLogs[t.tracking_no] &&
                            transactionLogs[t.tracking_no].length > 0 ? (
                              <table className="w-full border mt-2 text-sm">
                                <thead className="bg-[#2f2f33] text-gray-300">
                                  <tr>
                                    <th className="p-2 border border-gray-700">
                                      #
                                    </th>
                                    <th className="p-2 border border-gray-700">
                                      Date & Time
                                    </th>
                                    <th className="p-2 border border-gray-700">
                                      Received By
                                    </th>
                                    <th className="p-2 border border-gray-700">
                                      Action Taken
                                    </th>
                                    <th className="p-2 border border-gray-700">
                                      Remarks
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transactionLogs[t.tracking_no].map(
                                    (log, idx) => (
                                      <tr
                                        key={log.id}
                                        className="hover:bg-[#3a3a3f]"
                                      >
                                        <td className="p-2 border border-gray-700">
                                          {idx + 1}
                                        </td>
                                        <td className="p-2 border border-gray-700">
                                          {log.date_time_received}
                                        </td>
                                        <td className="p-2 border border-gray-700">
                                          {log.received_by}
                                        </td>
                                        <td className="p-2 border border-gray-700">
                                          {log.action_taken}
                                        </td>
                                        <td className="p-2 border border-gray-700">
                                          {log.remarks}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-gray-500 italic">
                                No logs found for this transaction.
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-3 border border-gray-700 text-center text-gray-500"
                    >
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </main>
        )}

        {/* --- Transactions Tab --- */}
        {activeTab === "transactions" && (
          <main className="bg-[#2a2a2e] p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Transactions</h2>

              <div className="flex items-center gap-3">
                {/* 🔍 Search Input */}
                <input
                  type="text"
                  placeholder="Search by Tracking No, Sender, or Document Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 rounded-md bg-[#1b1b1d] text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600 w-80"
                />

                {/* ➕ Add Transaction Button */}
                <button
                  onClick={() => setShowTransactionModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition"
                >
                  + Add Transaction
                </button>
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#1b1b1d] text-gray-300">
                <tr>
                  <th className="p-3 border border-gray-700">Tracking No</th>
                  <th className="p-3 border border-gray-700">
                    Date Endorsement
                  </th>
                  <th className="p-3 border border-gray-700">
                    Date & Time Received
                  </th>
                  <th className="p-3 border border-gray-700">Sender</th>
                  <th className="p-3 border border-gray-700">Doc Type</th>
                  <th className="p-3 border border-gray-700">
                    Document Name / Subject
                  </th>
                  <th className="p-3 border border-gray-700">File</th>
                  <th className="p-3 border border-gray-700">Forwarded To</th>
                  <th className="p-3 border border-gray-700">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => (
                    <React.Fragment key={t.tracking_no}>
                      <tr
                        className="hover:bg-[#3a3a3f] cursor-pointer"
                        onClick={() => toggleLogs(t.tracking_no)}
                      >
                        <td className="p-3 border border-gray-700">
                          {t.tracking_no}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.date_indorsement}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.datetime_receive}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.sender_name}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.document_type}
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.document_name}
                        </td>
                        <td className="p-3 border border-gray-700 text-yellow-400 underline">
                          <a
                            href={t.scanned_file}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                        </td>
                        <td className="p-3 border border-gray-700">
                          {t.forwarded_to}
                        </td>
                        <td className="p-3 border border-gray-700 capitalize justify-between flex items-center">
                          <span
                            className={`px-2 py-1 rounded-md text-xs ${
                              t.status === "completed"
                                ? "bg-green-700 text-white"
                                : t.status === "failed"
                                ? "bg-red-700 text-white"
                                : "bg-yellow-600 text-white"
                            }`}
                          >
                            {t.status}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditTransaction(t);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded-md ml-2"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>

                      {expandedTransaction === t.tracking_no && (
                        <tr>
                          <td
                            colSpan="9"
                            className="bg-[#1f1f21] border border-gray-700 p-4"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="font-semibold text-yellow-400">
                                Transaction Logs for {t.tracking_no}
                              </h3>
                              <button
                                onClick={() => handleOpenAddLog(t.tracking_no)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md transition"
                              >
                                + Add Log
                              </button>
                            </div>

                            {transactionLogs[t.tracking_no] &&
                            transactionLogs[t.tracking_no].length > 0 ? (
                              <table className="w-full border mt-2 text-sm">
                                <thead className="bg-[#2f2f33] text-gray-300">
                                  <tr>
                                    <th className="p-2 border border-gray-700">
                                      #
                                    </th>
                                    <th className="p-2 border border-gray-700">
                                      Date & Time
                                    </th>
                                    <th className="p-2 border border-gray-700">
                                      Received By
                                    </th>
                                    <th className="p-2 border border-gray-700">
                                      Action Taken
                                    </th>
                                    <th className="p-2 border border-gray-700">
                                      Remarks
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transactionLogs[t.tracking_no].map(
                                    (log, idx) => (
                                      <tr
                                        key={log.id}
                                        className="hover:bg-[#3a3a3f]"
                                      >
                                        <td className="p-2 border border-gray-700">
                                          {idx + 1}
                                        </td>
                                        <td className="p-2 border border-gray-700">
                                          {log.date_time_received}
                                        </td>
                                        <td className="p-2 border border-gray-700">
                                          {log.received_by}
                                        </td>
                                        <td className="p-2 border border-gray-700">
                                          {log.action_taken}
                                        </td>
                                        <td className="p-2 border border-gray-700">
                                          {log.remarks}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-gray-500 italic">
                                No logs found for this transaction.
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-3 border border-gray-700 text-center text-gray-500"
                    >
                      No ongoing transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </main>
        )}

        {/* --- User Management Tab --- */}
        {activeTab === "users" && (
          <main className="bg-[#2a2a2e] p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">User Management</h2>
              <button
                onClick={() => setShowUserModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
              >
                + Add User
              </button>
            </div>

            {message && (
              <p className="mb-4 text-green-400 font-semibold">{message}</p>
            )}

            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#1b1b1d] text-gray-300">
                <tr>
                  <th className="p-3 border border-gray-700">ID</th>
                  <th className="p-3 border border-gray-700">Full Name</th>
                  <th className="p-3 border border-gray-700">Username</th>
                  <th className="p-3 border border-gray-700">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#3a3a3f]">
                      <td className="p-3 border border-gray-700">{u.id}</td>
                      <td className="p-3 border border-gray-700">
                        {u.full_name}
                      </td>
                      <td className="p-3 border border-gray-700">
                        {u.username}
                      </td>
                      <td className="p-3 border border-gray-700 capitalize">
                        {u.role}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-3 border border-gray-700 text-center text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </main>
        )}
      </div>
      {/* ✅ Add Log Modal */}
      {showAddLogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              Add Log for {selectedTrackingNo}
            </h3>
            <form onSubmit={handleSubmitLog}>
              <input
                type="text"
                placeholder="Action Taken"
                value={logDetails.action_taken}
                onChange={(e) =>
                  setLogDetails({ ...logDetails, action_taken: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md p-2 mb-3"
              />

              <textarea
                placeholder="Remarks"
                value={logDetails.remarks}
                onChange={(e) =>
                  setLogDetails({ ...logDetails, remarks: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md p-2 mb-3"
              />

              <p className="text-sm text-white">Date & Time Received</p>
              <input
                type="datetime-local"
                value={logDetails.date_time_received}
                onChange={(e) =>
                  setLogDetails({
                    ...logDetails,
                    date_time_received: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-md p-2 mb-3"
              />

              <input
                type="text"
                value={logDetails.received_by}
                readOnly
                className="w-full border border-gray-200 bg-gray-900 rounded-md p-2 mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal2}
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-gray-950 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ✅ Add User Modal */}{" "}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          {" "}
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-96">
            {" "}
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>{" "}
            <form onSubmit={handleSubmit}>
              {" "}
              <input
                type="text"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />{" "}
              <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />{" "}
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />{" "}
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
              >
                {" "}
                <option value="user">User</option>{" "}
                <option value="admin">Admin</option>{" "}
              </select>{" "}
              <div className="flex justify-end gap-2">
                {" "}
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-950"
                >
                  {" "}
                  Cancel{" "}
                </button>{" "}
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {" "}
                  Save{" "}
                </button>{" "}
              </div>{" "}
            </form>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* 🚀 Create Transaction Modal */}{" "}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black flex justify-center items-center">
          {" "}
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-[500px] max-h-[90vh] overflow-y-auto">
            {" "}
            <h2 className="text-xl font-semibold mb-4">
              {" "}
              Create New Transaction{" "}
            </h2>{" "}
            <form onSubmit={handleTransactionSubmit}>
              {" "}
              <label className="block mb-2 font-medium">
                {" "}
                Date of Endorsement{" "}
              </label>{" "}
              <input
                type="date"
                value={transactionData.date_indorsement}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    date_indorsement: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />{" "}
              <label className="block mb-2 font-medium">
                {" "}
                Date and Time Received{" "}
              </label>{" "}
              <input
                placeholder="Date and Time Received"
                type="datetime-local"
                value={transactionData.datetime_receive}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    datetime_receive: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />{" "}
              <input
                type="text"
                placeholder="Sender Name"
                value={transactionData.sender_name}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    sender_name: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />{" "}
              <input
                type="text"
                placeholder="Office / Organization / Address"
                value={transactionData.organization}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    organization: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
              />{" "}
              <select
                value={transactionData.document_type}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    document_type: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md bg-gray-900"
              >
                {" "}
                <option value="CRMS LETTER">CRMS LETTER</option>{" "}
                <option value="HANDCARRY LETTER">HANDCARRY LETTER</option>{" "}
              </select>{" "}
              <input
                type="text"
                placeholder="Scanned File Link"
                value={transactionData.scanned_file}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    scanned_file: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
              />{" "}
              <input
                type="text"
                placeholder="Document Name"
                value={transactionData.document_name}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    document_name: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />{" "}
              <select
                value={transactionData.forwarded_to}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    forwarded_to: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md bg-gray-900"
              >
                {" "}
                <option value="">Select Department</option>{" "}
                <option value="EDM">EDM</option>{" "}
                <option value="ASSD">ASSD</option>{" "}
                <option value="TPDMD">TPDMD</option>{" "}
                <option value="EMD">EMD</option>{" "}
                <option value="HCDD">HCDD</option>{" "}
                <option value="AMD">AMD</option>{" "}
              </select>{" "}
              <textarea
                placeholder="Remarks"
                value={transactionData.remarks}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    remarks: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
              />{" "}
              <select
                value={transactionData.status}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    status: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md bg-gray-900"
              >
                {" "}
                <option value="ONGOING">ONGOING</option>{" "}
                <option value="COMPLETED">COMPLETED</option>{" "}
                <option value="FAILED">FAILED</option>{" "}
              </select>{" "}
              <div className="flex justify-end gap-2">
                {" "}
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-950"
                >
                  {" "}
                  Cancel{" "}
                </button>{" "}
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {" "}
                  Save Transaction{" "}
                </button>{" "}
              </div>{" "}
            </form>{" "}
          </div>{" "}
        </div>
      )}
      {showEditTransactionModal && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-[500px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              Edit Transaction — {editingTransaction.tracking_no}
            </h2>

            <form
              onSubmit={(e) =>
                handleEditTransactionSubmit(e, editingTransaction.tracking_no)
              }
            >
              <label className="block mb-2 font-medium">
                Date of Endorsement
              </label>
              <input
                type="date"
                value={editingTransaction.date_indorsement}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    date_indorsement: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />

              <label className="block mb-2 font-medium">
                Date and Time Received
              </label>
              <input
                type="datetime-local"
                value={editingTransaction.datetime_receive}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    datetime_receive: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />

              <input
                type="text"
                placeholder="Sender Name"
                value={editingTransaction.sender_name}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    sender_name: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />

              <input
                type="text"
                placeholder="Office / Organization / Address"
                value={editingTransaction.organization}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    organization: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
              />

              <select
                value={editingTransaction.document_type}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    document_type: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md bg-gray-900"
              >
                <option value="CRMS LETTER">CRMS LETTER</option>
                <option value="HANDCARRY LETTER">HANDCARRY LETTER</option>
              </select>

              <input
                type="text"
                placeholder="Scanned File Link"
                value={editingTransaction.scanned_file}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    scanned_file: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
              />

              <input
                type="text"
                placeholder="Document Name"
                value={editingTransaction.document_name}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    document_name: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
                required
              />

              <select
                value={editingTransaction.forwarded_to}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    forwarded_to: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md bg-gray-900"
              >
                <option value="">Select Department</option>
                <option value="EDM">EDM</option>
                <option value="ASSD">ASSD</option>
                <option value="TPDMD">TPDMD</option>
                <option value="EMD">EMD</option>
                <option value="HCDD">HCDD</option>
                <option value="AMD">AMD</option>
              </select>

              <textarea
                placeholder="Remarks"
                value={editingTransaction.remarks}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    remarks: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md"
              />

              <select
                value={editingTransaction.status}
                onChange={(e) =>
                  setEditingTransaction({
                    ...editingTransaction,
                    status: e.target.value,
                  })
                }
                className="w-full mb-3 px-4 py-2 border rounded-md bg-gray-900"
              >
                <option value="ONGOING">ONGOING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
              </select>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditTransactionModal(false)}
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* All modals remain the same (they’ll still look clean on dark backdrop) */}
    </div>
  );
}
