import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAuth } from "../../../../context/AuthContext";

const OperationsManagement = ({ formData, setFormData, eventId }) => {
  const { user } = useAuth();

  const [attendanceEnabled, setAttendanceEnabled] = useState(
    formData?.operations?.attendanceEnabled || false,
  );

  const [customers, setCustomers] = useState([]); // merged list
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ALL CUSTOMERS ================= */
  useEffect(() => {
    const fetchAllCustomers = async () => {
      if (!user?.uid) return;

      setLoading(true);

      /* -------- Institute Customers -------- */
      const instituteQuery = query(
        collection(db, "students"),
        where("instituteId", "==", user.uid),
      );

      const instituteSnap = await getDocs(instituteQuery);

      const instituteCustomers = instituteSnap.docs.map((doc) => ({
        id: doc.id,
        name: `${doc.data().firstName || ""} ${doc.data().lastName || ""}`,
        category: doc.data().category || "Institute",
        instituteId: user.uid,
        type: "institute",
      }));

      /* -------- Outside Customers (from formData) -------- */
      const outsideCustomers = (formData?.customers || []).map((c) => ({
        id: `outside_${c.id || c.phone || Math.random()}`,
        name: c.name,
        category: c.category || "Outside",
        instituteId: user.uid,
        type: "outside",
      }));

      /* -------- Merge -------- */
      const merged = [...instituteCustomers, ...outsideCustomers];

      setCustomers(merged);

      setLoading(false);
    };

    fetchAllCustomers();
  }, [user, formData]);

  /* ================= FETCH EXISTING ATTENDANCE ================= */
  useEffect(() => {
    if (!attendanceEnabled || !eventId) return;

    const fetchAttendance = async () => {
      const data = {};

      for (let customer of customers) {
        const ref = doc(db, "events", eventId, "eventAttendance", customer.id);

        const snap = await getDoc(ref);

        if (snap.exists()) {
          data[customer.id] = snap.data();
        }
      }

      setAttendanceData(data);
    };

    if (customers.length > 0) fetchAttendance();
  }, [attendanceEnabled, customers, eventId]);

  /* ================= SAVE TO FORM DATA ================= */
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      operations: {
        ...prev.operations,
        attendanceEnabled,
      },
    }));
  }, [attendanceEnabled]);

  /* ================= HANDLE STATUS ================= */
  /* ================= HANDLE STATUS ================= */
  const handleAttendanceChange = async (customer, status) => {
    const updatedAttendanceData = {
      ...attendanceData,
      [customer.id]: {
        ...attendanceData[customer.id],
        status,
        reason: attendanceData[customer.id]?.reason || "",
      },
    };

    setAttendanceData(updatedAttendanceData);

    if (!eventId) return;

    // Find the index of the customer in participants.customers
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
      const eventData = eventSnap.data();
      const customersArray = eventData?.participants?.customers || [];

      const updatedCustomers = customersArray.map((c) => {
        if (c.phone === customer.id || c.id === customer.id) {
          return {
            ...c,
            attendance: {
              status,
              reason: updatedAttendanceData[customer.id]?.reason || "",
              updatedAt: serverTimestamp(),
            },
          };
        }
        return c;
      });

      await setDoc(
        eventRef,
        {
          participants: {
            ...eventData.participants,
            customers: updatedCustomers,
          },
        },
        { merge: true },
      );
    }
  };

  /* ================= HANDLE REASON ================= */
  const handleReasonChange = async (customer, value) => {
    const updatedAttendanceData = {
      ...attendanceData,
      [customer.id]: {
        ...attendanceData[customer.id],
        reason: value,
      },
    };

    setAttendanceData(updatedAttendanceData);

    if (!eventId) return;

    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
      const eventData = eventSnap.data();
      const customersArray = eventData?.participants?.customers || [];

      const updatedCustomers = customersArray.map((c) => {
        if (c.phone === customer.id || c.id === customer.id) {
          return {
            ...c,
            attendance: {
              status: updatedAttendanceData[customer.id]?.status || "",
              reason: value,
              updatedAt: serverTimestamp(),
            },
          };
        }
        return c;
      });

      await setDoc(
        eventRef,
        {
          participants: {
            ...eventData.participants,
            customers: updatedCustomers,
          },
        },
        { merge: true },
      );
    }
  };
  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-6">
          Operations Management
        </h2>

        {/* ATTENDANCE TOGGLE */}
        <div className="mb-6 space-y-3">
          <p className="font-semibold text-sm">Attendance Tracking*</p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setAttendanceEnabled(true)}
              className={`px-4 py-1 rounded ${
                attendanceEnabled ? "bg-green-500 text-white" : "border"
              }`}
            >
              Enable
            </button>

            <button
              onClick={() => setAttendanceEnabled(false)}
              className={`px-4 py-1 rounded ${
                !attendanceEnabled ? "bg-gray-500 text-white" : "border"
              }`}
            >
              Disable
            </button>
          </div>
        </div>

        {/* TABLE */}
        {attendanceEnabled && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-black text-orange-400">
                <tr>
                  <th className="px-4 py-2 text-left">Customer Name</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-center">Present</th>
                  <th className="px-4 py-2 text-center">Absent</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{customer.name}</td>

                    <td className="px-4 py-2">{customer.category}</td>

                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={
                          attendanceData[customer.id]?.status === "present"
                        }
                        onChange={() =>
                          handleAttendanceChange(customer, "present")
                        }
                      />
                    </td>

                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={
                          attendanceData[customer.id]?.status === "absent"
                        }
                        onChange={() =>
                          handleAttendanceChange(customer, "absent")
                        }
                      />
                    </td>

                    <td className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Reason..."
                        className="border rounded px-2 py-1 w-full"
                        value={attendanceData[customer.id]?.reason || ""}
                        onChange={(e) =>
                          handleReasonChange(customer, e.target.value)
                        }
                        disabled={
                          attendanceData[customer.id]?.status !== "absent"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationsManagement;
