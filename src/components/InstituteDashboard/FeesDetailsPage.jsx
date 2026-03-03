import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { ChevronDown } from "lucide-react";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const FeesDetailsPage = () => {
  const instituteId = auth.currentUser?.uid;

  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthRef = useRef(null);

  const [editData, setEditData] = useState({
    totalFee: "",
    paidAmount: "",
    paidDate: "",
  });

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "students"),
      where("instituteId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [instituteId]);

  /* ================= FETCH FEES ================= */
  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "studentFees"),
      where("instituteId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      setFees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [instituteId]);

  /* ================= SEARCH FILTER ================= */
  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      `${s.firstName} ${s.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [students, search]);

  /* ================= EDIT PAYMENT ================= */
  const handleEditPayment = (student) => {
    if (!selectedMonth) {
      alert("Please select a month first!");
      return;
    }

    setSelectedStudent(student);

    const existingFee = fees.find(
      (f) => f.studentId === student.id && f.month === selectedMonth,
    );

    setEditData({
      totalFee: student.monthlyFee || 0,
      paidAmount: existingFee?.paidAmount || "",
      paidDate: existingFee?.paidDate || "",
    });

    setShowEditModal(true);
  };
  const updatePayment = async () => {
    if (!selectedStudent) return;

    const { totalFee, paidAmount, paidDate } = editData;

    if (!selectedMonth) {
      alert("Please select a month first!");
      return;
    }

    if (!totalFee) {
      alert("Please enter total fee");
      return;
    }

    try {
      // Update total fee in student record
      await updateDoc(doc(db, "students", selectedStudent.id), {
        monthlyFee: Number(totalFee),
      });

      // Save payment in studentFees collection (month-wise)
      if (paidAmount && paidDate) {
        await setDoc(doc(collection(db, "studentFees")), {
          studentId: selectedStudent.id,
          instituteId,
          totalAmount: Number(totalFee),
          paidAmount: Number(paidAmount),
          paidDate,
          month: selectedMonth,
          createdAt: serverTimestamp(),
        });
      }

      // Success message
      alert("Payment updated successfully ✅");

      setShowEditModal(false);
      setSelectedStudent(null); // optional: deselect student after save
    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Error saving payment! ❌");
    }
  };

  /* ================= CALCULATIONS ================= */
  const totalStudents = students.length;

  const totalAmount = students.reduce(
    (sum, s) => sum + Number(s.monthlyFee || 0),
    0,
  );

  const totalPaid = fees
    .filter((f) => f.month === selectedMonth)
    .reduce((sum, f) => sum + Number(f.paidAmount || 0), 0);

  const totalPending = totalAmount - totalPaid;

  const getStudentFeeData = (student) => {
    const total = Number(student.monthlyFee || 0);
    const feeRecord = fees.find(
      (f) => f.studentId === student.id && f.month === selectedMonth,
    );
    const paid = Number(feeRecord?.paidAmount || 0);
    const pending = total - paid;
    const paidDate = feeRecord?.paidDate || "-";
    return { total, paid, pending, paidDate };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Fees Details</h1>
        <div ref={monthRef} className="relative w-full sm:w-48">
          <button
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            className="bg-orange-500 text-white rounded-lg px-4 py-3 font-semibold w-full flex items-center justify-between"
          >
            <span>
              {selectedMonth
                ? MONTHS.find((m) => m.value === selectedMonth)?.label
                : "Select Month"}
            </span>
            <ChevronDown
              size={18}
              className={`ml-2 flex-shrink-0 transition-transform ${
                showMonthDropdown ? "rotate-180" : ""
              }`}
            />
          </button>

          {showMonthDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
              {MONTHS.map((m) => (
                <div
                  key={m.value}
                  onClick={() => {
                    setSelectedMonth(m.value);
                    setShowMonthDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                >
                  {m.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="Total Fees Amount" value={`₹ ${totalAmount}`} />
        <StatCard title="Total Fees Pending" value={`₹ ${totalPending}`} />
        <StatCard title="Total Fees Paid" value={`₹ ${totalPaid}`} />
        <StatCard title="Total Students" value={totalStudents} />
      </div>

      {/* SEARCH */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <input
          type="text"
          placeholder="Search here..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-orange-400 rounded px-4 py-2 w-full sm:w-80 focus:outline-none focus:ring-0 focus:border-orange-400"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="grid grid-cols-5 min-w-[700px] bg-black text-orange-500 px-6 py-3 font-semibold">
          <div>Students Name</div>
          <div>Sessions</div>
          <div>Total Amount</div>
          <div>Paid</div>
          <div>Pending</div>
        </div>

        {filteredStudents.map((student) => {
          const data = getStudentFeeData(student);

          return (
            <div
              key={student.id}
              className={`grid grid-cols-5 min-w-[700px] px-6 py-4 border-t items-center cursor-pointer`}
            >
              <div>
                {student.firstName} {student.lastName}
              </div>
              <div>{student.sessions || "-"}</div>
              <div
                className="text-black font-semibold cursor-pointer"
                onClick={() => handleEditPayment(student)}
              >
                ₹ {data.total}
              </div>
              <div
                className="text-green-600 font-semibold cursor-pointer"
                onClick={() => handleEditPayment(student)}
              >
                ₹ {data.paid} {data.paidDate !== "-" && `on ${data.paidDate}`}
              </div>
              <div className="text-red-600 font-semibold">₹ {data.pending}</div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {showEditModal && (
        <ModalForm
          title="Update Payment"
          data={editData}
          setData={setEditData}
          onSave={updatePayment}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-black text-white p-4 rounded-lg">
    <h3 className="text-sm">{title}</h3>
    <p className="text-xl font-bold text-orange-500 mt-2">{value}</p>
  </div>
);

const ModalForm = ({ title, data, setData, onSave, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl w-[90%] sm:w-96 space-y-4">
      <h2 className="font-semibold">{title}</h2>

      <input
        type="number"
        className="border w-full p-2 rounded"
        placeholder="Total Fee"
        value={data.totalFee}
        onChange={(e) => setData({ ...data, totalFee: e.target.value })}
      />

      <input
        type="number"
        className="border w-full p-2 rounded"
        placeholder="Paid Amount"
        value={data.paidAmount}
        onChange={(e) => setData({ ...data, paidAmount: e.target.value })}
      />

      <input
        type="date"
        className="border w-full p-2 rounded"
        placeholder="Paid Date"
        value={data.paidDate}
        onChange={(e) => setData({ ...data, paidDate: e.target.value })}
      />

      <div className="flex justify-end gap-3">
        <button onClick={onClose}>Cancel</button>
        <button
          onClick={onSave}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

export default FeesDetailsPage;
