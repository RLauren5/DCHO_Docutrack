// src/pages/UserDashboard.jsx
import React, { useState, useEffect } from "react";

const API_BASE = "http://192.168.1.224/DCHO-docutrack-api/api";

export default function UserDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState([]);
  const [history, setHistory] = useState([]);
  const [expandedTransaction, setExpandedTransaction] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showModal1, setShowModal1] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");
  const [logDetails, setLogDetails] = useState({
    remarks: "",
    action_taken: "",
    date_time_received: "",
    received_by: user?.full_name || "",
  });

  useEffect(() => {
    fetchUserTransactions();
  }, []);

  // ✅ Fetch all user transactions then filter in UI
  const fetchUserTransactions = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/get_transactions.php?role=user&username=${user?.username}`
      );
      const data = await res.json();
      console.log("Fetched Transactions Data:", data);

      if (data.success) {
        setTransactions(data.transactions || []); // ongoing
        // Combine completed + failed into "history"
        setHistory([...(data.completed || []), ...(data.failed || [])]);
      } else {
        setTransactions([]);
        setHistory([]);
      }
    } catch (err) {
      console.error("Error fetching user transactions:", err);
    }
  };

  // ✅ Fetch logs for a specific transaction
  const fetchLogs = async (tracking_no) => {
    try {
      const res = await fetch(
        `${API_BASE}/get_transactions.php?tracking_no=${tracking_no}`
      );
      const data = await res.json();
      if (data.success) setLogs(data.logs || []);
      else setLogs([]);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const handleToggleLogs = async (tracking_no) => {
    if (expandedTransaction === tracking_no) {
      setExpandedTransaction(null);
      setLogs([]);
      return;
    }
    await fetchLogs(tracking_no);
    setExpandedTransaction(tracking_no);
  };

  const handleOpenModal = () => setShowModal1(true);
  const handleCloseModal1 = () => {
    setShowModal1(false);
    setTrackingNo("");
  };
  const handleCloseModal2 = () => {
    setShowModal2(false);
    setLogDetails({
      remarks: "",
      action_taken: "",
      date_time_received: "",
      received_by: user?.full_name || "",
    });
  };

  // ✅ Validate tracking number
  // ✅ Validate tracking number only (no log form opening)
const handleVerifyTracking = async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`${API_BASE}/check_transaction.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_no: trackingNo }),
    });
    const data = await res.json();

    if (!data.exists) {
      alert("❌ Tracking number not found.");
      setShowModal1(false);
      return;
    }

    if (data.status === "COMPLETED" || data.status === "FAILED") {
      const statusMessage =
        data.status === "COMPLETED"
          ? "⚠️ This transaction is already COMPLETED and cannot be logged."
          : "❌ This transaction has FAILED and cannot be logged.";
      alert(statusMessage);
      setShowModal1(false);
      return;
    }

    // ✅ Save transaction to user's dashboard
    await fetch(`${API_BASE}/save_user_transaction.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user?.username,
        tracking_no: trackingNo,
      }),
    });

    // ✅ Automatically add log for "Received"
    const autoLog = {
      tracking_no: trackingNo,
      remarks: "Received",
      action_taken: "Received",
      date_time_received: new Date().toISOString().slice(0, 16),
      received_by: user?.full_name || "Unknown",
    };

    await fetch(`${API_BASE}/add_log.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(autoLog),
    });

    alert("✅ Tracking number verified and initial log added!");
    setShowModal1(false);
    setTrackingNo("");
    await fetchUserTransactions();
  } catch (err) {
    console.error(err);
    alert("Error verifying tracking number.");
    setShowModal1(false);
  }
};

  // ✅ Save log entry
  const handleSubmitLog = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/add_log.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_no: trackingNo,
          remarks: logDetails.remarks,
          action_taken: logDetails.action_taken,
          date_time_received: logDetails.date_time_received,
          received_by: logDetails.received_by,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Log added successfully!");
        handleCloseModal2();
        await fetchUserTransactions();
        await fetchLogs(trackingNo);
        setExpandedTransaction(trackingNo);
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save log entry.");
    }
  };

  // ✅ Reusable table renderer
  const renderTransactionTable = (list) => (
    <table className="w-full border-collapse text-sm">
      <thead className="bg-[#1b1b1d] text-gray-300">
        <tr className="text-sm">
          <th className="p-3 border border-gray-700">Tracking No.</th>
          <th className="p-3 border border-gray-700">Date Endorsement</th>
          <th className="p-3 border border-gray-700">Date & Time Received</th>
          <th className="p-3 border border-gray-700">Sender</th>
          <th className="p-3 border border-gray-700">Document Type</th>
          <th className="p-3 border border-gray-700">Document Name</th>
          <th className="p-3 border border-gray-700">File Link</th>
          <th className="p-3 border border-gray-700">Forwarded To</th>
          <th className="p-3 border border-gray-700">Status</th>
          <th className="p-3 border border-gray-700">Logs</th>
        </tr>
      </thead>
      <tbody>
        {list.length === 0 ? (
          <tr>
            <td colSpan="10" className="text-center py-4 text-gray-400">
              No records found.
            </td>
          </tr>
        ) : (
          list.map((t) => (
            <React.Fragment key={t.tracking_no}>
              <tr className="hover:bg-[#3a3a3f] cursor-pointer">
                <td className="p-3 border border-gray-700">{t.tracking_no}</td>
                <td className="p-3 border border-gray-700">
                  {t.date_indorsement}
                </td>
                <td className="p-3 border border-gray-700">
                  {t.datetime_receive}
                </td>
                <td className="p-3 border border-gray-700">{t.sender_name}</td>
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
                <td className="p-3 border border-gray-700">{t.forwarded_to}</td>
                <td className="p-3 border border-gray-700">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      t.status === "COMPLETED"
                        ? "bg-green-600"
                        : t.status === "ONGOING"
                        ? "bg-yellow-600"
                        : "bg-red-600"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-3 border border-gray-700">
                  <button
                    onClick={() => handleToggleLogs(t.tracking_no)}
                    className="text-yellow-400 hover:text-yellow-300 font-semibold"
                  >
                    {expandedTransaction === t.tracking_no
                      ? "Hide Logs"
                      : "View Logs"}
                  </button>
                </td>
              </tr>

              {expandedTransaction === t.tracking_no && (
                <tr className="bg-[#1f1f21] border border-gray-700">
                  <td colSpan="10" className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-yellow-400"> 
                        Transaction Logs for {t.tracking_no}
                      </h3>
                      <button
                        onClick={() => {
                          setTrackingNo(t.tracking_no);
                          setShowModal2(true);
                          setLogDetails({
                            remarks: "",
                            action_taken: "",
                            date_time_received: new Date()
                              .toISOString()
                              .slice(0, 16),
                            received_by: user?.full_name || "",
                          });
                        }}
                        disabled={
                          t.status === "COMPLETED" || t.status === "FAILED"
                        }
                        className={`px-3 py-1 rounded font-semibold ${
                          t.status === "COMPLETED" || t.status === "FAILED"
                            ? "bg-gray-500 cursor-not-allowed text-gray-300"
                            : "bg-yellow-500 hover:bg-yellow-400 text-black"
                        }`}
                      >
                        + Add Log
                      </button>
                    </div>

                    {logs && logs.length > 0 ? (
                      <table className="w-full text-sm border border-gray-700">
                        <thead className="bg-[#2f2f33] text-gray-300">
                          <tr>
                            <th className="p-2 border border-gray-700">#</th>
                            <th className="p-2 border border-gray-700">
                              Date & Time Received
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
                          {logs.map((log, idx) => (
                            <tr key={log.id} className="hover:bg-[#3a3a3f]">
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
                                {log.remarks}
                              </td>
                              <td className="p-2 border border-gray-700">
                                {log.action_taken}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-400 text-sm italic">
                        No logs yet.
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div className="min-h-screen bg-blue-950 text-gray-200 p-8">
      {/* HEADER */}
      <header className="bg-[#1b1b1d] rounded-2xl p-6 mb-8 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, {user?.full_name || "User"}
          </h1>
          <p className="text-gray-400">
            Logged in as{" "}
            <span className="text-yellow-300">{user?.role || "user"}</span>
          </p>
        </div>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-semibold transition"
        >
          Logout
        </button>
      </header>

      {/* TABS */}
      <div className="bg-[#1b1b1d] p-6 rounded-2xl shadow-xl">
        <div className="flex space-x-8 border-b border-gray-700 mb-6">
          {[
            { id: "transactions", label: "TRANSACTIONS" },
            { id: "history", label: "TRANSACTION HISTORY" },
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

        {/* ONGOING TRANSACTIONS */}
        {activeTab === "transactions" && (
          <main className="bg-[#2a2a2e] p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Transactions</h2>
              <button
                onClick={handleOpenModal}
                className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-400 transition font-semibold"
              >
                + Add Tracking Number
              </button>
            </div>
            {renderTransactionTable(transactions)}
          </main>
        )}

        {/* TRANSACTION HISTORY */}
        {activeTab === "history" && (
          <main className="bg-[#2a2a2e] p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold mb-6">Transaction History</h2>
            {renderTransactionTable(history)}
          </main>
        )}
      </div>

      {/* MODALS */}
      {showModal1 && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-[#1E1E1E] border border-yellow-500 rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">
              Enter Tracking Number
            </h3>
            <form onSubmit={handleVerifyTracking}>
              <input
                type="text"
                className="w-full bg-[#2C2C2C] border border-yellow-600 text-white rounded-md p-2 mb-4 focus:outline-none"
                placeholder="Enter tracking number..."
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal1}
                  className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-400"
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal2 && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-[#1E1E1E] border border-yellow-500 rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">
              Add Log Details
            </h3>
            <form onSubmit={handleSubmitLog}>
              <input
                type="text"
                placeholder="Action Taken"
                value={logDetails.action_taken}
                onChange={(e) =>
                  setLogDetails({ ...logDetails, action_taken: e.target.value })
                }
                className="w-full bg-[#2C2C2C] border border-yellow-600 text-white rounded-md p-2 mb-3"
              />
              <textarea
                placeholder="Remarks"
                value={logDetails.remarks}
                onChange={(e) =>
                  setLogDetails({ ...logDetails, remarks: e.target.value })
                }
                className="w-full bg-[#2C2C2C] border border-yellow-600 text-white rounded-md p-2 mb-3"
              />
              <p className="text-yellow-400 mb-1 text-sm">
                Date & Time Received
              </p>
              <input
                type="datetime-local"
                value={logDetails.date_time_received}
                onChange={(e) =>
                  setLogDetails({
                    ...logDetails,
                    date_time_received: e.target.value,
                  })
                }
                className="w-full bg-[#2C2C2C] border border-yellow-600 text-white rounded-md p-2 mb-3"
              />
              <input
                type="text"
                value={logDetails.received_by}
                readOnly
                className="w-full bg-[#2C2C2C] border border-yellow-600 text-gray-400 rounded-md p-2 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal2}
                  className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-400"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
