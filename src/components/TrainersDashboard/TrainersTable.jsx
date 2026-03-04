import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const StudentsTable = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    name: "",
    category: "",
    sessions: "",
    phone: "",
  });

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.uid) return;

      try {
        const q = query(
          collection(db, "trainerstudents"),
          where("trainerId", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        const studentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setStudents(studentsData);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };

    fetchStudents();
  }, [user]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({
      name: `${row.firstName || ""} ${row.lastName || ""}`,
      category: row.category || "",
      sessions: row.sessions || "",
      phone: row.phone || "",
    });
  };

  const saveOrStartEdit = async (row) => {
    if (editingId === row.id) {
      try {
        const studentRef = doc(db, "trainerstudents", row.id);
        const [firstName, ...rest] = draft.name.trim().split(" ");
        const lastName = rest.join(" ");

        await updateDoc(studentRef, {
          firstName,
          lastName,
          category: draft.category,
          sessions: draft.sessions,
          phone: draft.phone,
        });

        setStudents((prev) =>
          prev.map((s) =>
            s.id === row.id
              ? {
                  ...s,
                  firstName,
                  lastName,
                  category: draft.category,
                  sessions: draft.sessions,
                  phone: draft.phone,
                }
              : s
          )
        );

        setEditingId(null);
      } catch (err) {
        console.error("Error updating student:", err);
      }
    } else {
      startEdit(row);
    }
  };

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow w-full">
      {/* HEADER */}
      <div className="grid grid-cols-4 px-6 py-4 bg-[#1e293b] text-white font-bold text-lg items-center">
        <div className="text-center">Students Name</div>
        <div className="text-center">Category</div>
        <div className="text-center">Sessions</div>
        <div className="text-center">Phone Number</div>
      </div>

      {/* BODY */}
      <div className="bg-white text-black">
        {students.length === 0 ? (
          <div className="px-6 py-6 text-center text-gray-500 font-medium">
            No students assigned
          </div>
        ) : (
          students.map((row, index) => {
            const isEditing = editingId === row.id;

            return (
              <div
                key={row.id}
                className="grid grid-cols-4 px-6 py-4 border-b border-gray-200 text-sm items-center hover:bg-gray-100 cursor-pointer"
                onClick={() => saveOrStartEdit(row)}
              >
                <div className="text-center">
                  {isEditing ? (
                    <input
                      value={draft.name}
                      onChange={(e) =>
                        handleChange("name", e.target.value)
                      }
                      className="border px-2 py-1 rounded text-xs w-full text-center"
                    />
                  ) : (
                    `${index + 1}. ${row.firstName || ""} ${
                      row.lastName || ""
                    }`
                  )}
                </div>

                <div className="text-center">
                  {isEditing ? (
                    <input
                      value={draft.category}
                      onChange={(e) =>
                        handleChange("category", e.target.value)
                      }
                      className="border px-2 py-1 rounded text-xs w-full text-center"
                    />
                  ) : (
                    row.category
                  )}
                </div>

                <div className="text-center">
                  {isEditing ? (
                    <input
                      value={draft.sessions}
                      onChange={(e) =>
                        handleChange("sessions", e.target.value)
                      }
                      className="border px-2 py-1 rounded text-xs w-full text-center"
                    />
                  ) : (
                    row.sessions
                  )}
                </div>

                <div className="text-center">
                  {isEditing ? (
                    <input
                      value={draft.phone}
                      onChange={(e) =>
                        handleChange("phone", e.target.value)
                      }
                      className="border px-2 py-1 rounded text-xs w-full text-center"
                    />
                  ) : (
                    row.phone
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentsTable;