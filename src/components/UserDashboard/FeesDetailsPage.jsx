import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const PaymentOverview = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feeHistory, setFeeHistory] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // =========================
          // Fetch student data
          // =========================
          const studentRef = doc(db, "students", user.uid);
          const snap = await getDoc(studentRef);

          if (snap.exists()) {
            const studentData = snap.data();
            setStudent(studentData);

            // =========================
            // Fetch payment history
            // =========================
            const feesRef = collection(db, "studentFees");
            const q = query(feesRef, where("studentId", "==", user.uid));
            const feesSnap = await getDocs(q);

            const history = [];
            let paidSum = 0;

            feesSnap.forEach((doc) => {
              const data = doc.data();
              history.push(data);
              paidSum += Number(data.paidAmount || 0);
            });

            setFeeHistory(history);
            setTotalPaid(paidSum);
          } else {
            console.log("No student data found");
          }
        } catch (err) {
          console.error("Error fetching student:", err);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!student) return <div className="p-8">No Data Found</div>;

  const monthlyFee = Number(student.monthlyFee || 0);
  const pendingFee = monthlyFee - totalPaid;

  return (
    <div className="bg-white min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Payment Overview</h1>

        <button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-5 py-2 rounded-md flex items-center gap-2">
          <Download size={18} />
          Download Receipt
        </button>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-2 gap-8">
        {/* Customer Card */}
        <div className="bg-white border border-orange-400 rounded-lg">
          {/* Top Section */}
          <div className="p-5 border-b border-orange-300">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">
                  Customer 01 : {student.firstName} {student.lastName}
                </h3>
                <p className="text-xs text-gray-500">
                  {student.category} - {student.subCategory}
                </p>
              </div>
              <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-600">Due Amount</p>
              <p className="text-red-500 font-semibold text-lg">
                ₹{monthlyFee}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                To be paid : {student.monthlyDate}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div className="p-5 border-b border-orange-300">
            <h4 className="font-semibold mb-3">Payment History</h4>

            {feeHistory.length === 0 && (
              <p className="text-xs text-gray-400">No payments found</p>
            )}

            {feeHistory.map((item, index) => (
              <div key={index} className="flex justify-between text-sm mb-3">
                <div>
                  <p className="font-medium">{item.paidDate}</p>
                  <p className="text-gray-500 text-xs">Month : {item.month}</p>
                </div>
                <p className="font-medium">₹{item.paidAmount}</p>
              </div>
            ))}
          </div>

          {/* Bottom Summary */}
          <div className="p-5 text-sm font-medium">
            <div className="flex justify-between  mb-2">
              <p>Fees Paid</p>
              <p>₹{totalPaid}</p>
            </div>
            <div className="flex justify-between">
              <p>Pending Fees</p>
              <p>₹{pendingFee < 0 ? 0 : pendingFee}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentOverview;
