import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function ChangePassword({ goBack }) {
  const { currentUser, changePassword, login } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!employeeId || !oldPassword || !newPassword || !confirmPassword) {
      setMessage("所有欄位都必須填寫");
      return;
    }
    if (!login(employeeId, oldPassword)) {
      setMessage("員工編號或舊密碼錯誤");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("新密碼與確認密碼不一致");
      return;
    }
    changePassword(employeeId, newPassword);
    setMessage("密碼修改成功！");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="card w-full max-w-lg bg-white shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">修改密碼</h2>
        {message && <p className="mb-2 text-center">{message}</p>}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="員工編號"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="input input-bordered w-full"
          />
          <input
            type="password"
            placeholder="舊密碼"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="input input-bordered w-full"
          />
          <input
            type="password"
            placeholder="新密碼"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input input-bordered w-full"
          />
          <input
            type="password"
            placeholder="確認新密碼"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input input-bordered w-full"
          />
          <button onClick={handleSubmit} className="btn btn-primary w-full text-lg">
            確認修改
          </button>
          <button onClick={goBack} className="btn btn-secondary w-full text-lg">
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
