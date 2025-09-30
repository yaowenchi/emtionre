import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(employeeId, password)) {
      navigate("/dashboard"); // 登入成功導向主畫面
    } else {
      setError("員工編號或密碼錯誤");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-300">
      <div className="bg-white shadow-2xl rounded-xl p-10 w-full max-w-lg">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          員工登入系統
        </h1>

        {error && (
          <p className="text-red-500 text-center font-semibold mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 員工編號 */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              員工編號
            </label>
            <input
              type="text"
              placeholder="請輸入員工編號"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* 密碼 */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              密碼
            </label>
            <input
              type="password"
              placeholder="請輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* 登入按鈕 */}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg shadow-md transition"
          >
            登入
          </button>
        </form>

        {/* 修改密碼按鈕 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/change-password")}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-lg shadow-md transition"
          >
            修改密碼
          </button>
        </div>
      </div>
    </div>
  );
}
