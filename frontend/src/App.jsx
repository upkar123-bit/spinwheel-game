import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";

const API = import.meta.env.VITE_API || "http://localhost:4000";
const socket = io(API);

export default function App() {
  const [users, setUsers] = useState([]);
  const [wheels, setWheels] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [userId, setUserId] = useState(2); // demo default
  const [ownerId, setOwnerId] = useState(1); // admin default

  // Real-time socket listeners
  useEffect(() => {
    socket.on("connect", () => console.log("Connected to backend via socket.io"));
    socket.on("participantJoined", (d) => {
      if (selectedWheel && d.wheelId === selectedWheel.id) setParticipants(d.participants);
      fetchWheels();
    });
    socket.on("wheelCreated", fetchWheels);
    socket.on("wheelStarted", fetchWheels);
    socket.on("userEliminated", fetchWheels);
    socket.on("wheelFinished", fetchWheels);

    fetchData();

    return () => socket.off();
  }, [selectedWheel]);

  // Fetch initial data
  async function fetchData() {
    fetchWheels();
    const u = await axios.get(`${API}/api/users`);
    setUsers(u.data);
  }

  async function fetchWheels() {
    const r = await axios.get(`${API}/api/wheels`);
    setWheels(r.data);
  }

  async function createWheel() {
    await axios.post(`${API}/api/wheels`, { owner_id: ownerId, entry_fee: 500 });
    fetchWheels();
  }

  async function joinWheel(id) {
    await axios.post(`${API}/api/wheels/${id}/join`, { user_id: userId });
    const p = await axios.get(`${API}/api/wheels/${id}/participants`);
    setParticipants(p.data);
    setSelectedWheel(wheels.find((w) => w.id === id));
  }

  async function startWheel(id) {
    await axios.post(`${API}/api/wheels/${id}/start`, { owner_id: ownerId });
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Spin Wheel Game (Demo)</h1>
      <div style={{ display: "flex", gap: 20 }}>
        {/* Users & Wheels Section */}
        <div style={{ flex: 1 }}>
          <h3>Users</h3>
          <select value={userId} onChange={(e) => setUserId(Number(e.target.value))}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} — {u.coins} coins
              </option>
            ))}
          </select>

          <h3>Wheels</h3>
          <button onClick={createWheel}>Create Wheel (Admin)</button>
          <ul>
            {wheels.map((w) => (
              <li key={w.id} style={{ marginBottom: 10 }}>
                <strong>Wheel #{w.id}</strong> — Status: {w.status} — Entry: {w.entry_fee} coins
                <div>
                  <button onClick={() => joinWheel(w.id)}>Join</button>
                  <button onClick={() => startWheel(w.id)}>Start (Admin)</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Selected Wheel Participants */}
        <div style={{ flex: 1 }}>
          <h3>Selected Wheel Participants</h3>
          <ul>
            {participants.map((p) => (
              <li key={p.id}>
                {p.username} {p.eliminated_at ? "(Eliminated)" : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

