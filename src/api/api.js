const API_BASE = "http://192.168.1.224/DCHO-docutrack-api/api";

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Login failed");
  return data;
}

// Create a new transaction
export async function createTransaction(data) {
  const res = await fetch(`${API_BASE}/transactions.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create transaction");
  return await res.json();
}

// Fetch all transactions
export async function getAllTransactions() {
  const res = await fetch(`${API_BASE}/get_transactions.php`);
  if (!res.ok) throw new Error("Failed to load transactions");
  return await res.json();
}


export async function createUser(newUser) {
  const response = await fetch(`${API_BASE}/create_user.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newUser),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create user");
  }

  return data;
}



export async function getUsers() {
  const res = await fetch(`${API_BASE}/get_users.php`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load users");
  return data;
}



export async function logout() {
  await fetch(`${API_BASE}/logout.php`, { method: "POST" });
}
