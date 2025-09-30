import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [date, setDate] = useState("");
  const navigate = useNavigate();

  const handleConfirm = () => {
    if (date) {
      navigate(`/chart?date=${date}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="card w-full max-w-lg bg-white shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">選擇日期</h2>
        <div className="space-y-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input input-bordered w-full"
          />
          <button onClick={handleConfirm} className="btn btn-primary w-full text-lg">
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
