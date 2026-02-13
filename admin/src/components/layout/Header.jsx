import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    User,
    Settings,
    LogOut,
    ChevronDown,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { logoutUser } from "../../store/slices/authSlice";

export default function Header() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { user } = useSelector((s) => s.auth);

    const [open, setOpen] = useState(false);

    const fullName = user?.profile?.fullName || "Admin";

    const avatar =
        user?.profile?.avatar?.url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
            fullName
        )}&background=6A1B9A&color=fff`;

    return (
        <header
            className="
        fixed top-0 left-0 right-0 h-16
        bg-purple-900 text-white
        shadow-lg
        flex items-center justify-between
        px-8
        z-50
      "
        >
            {/* ================= LEFT: BRAND ================= */}
            <h1 className="font-semibold text-lg tracking-wide">
                Asiyo Admin Panel
            </h1>

            {/* ================= RIGHT: PROFILE ================= */}
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className="
            flex items-center gap-3
            px-3 py-2
            rounded-lg
            hover:bg-white/10
            transition
          "
                >
                    <span className="text-sm font-medium">
                        {fullName}
                    </span>

                    <img
                        src={avatar}
                        alt="avatar"
                        className="
              w-9 h-9
              rounded-full
              border-2 border-white/40
              object-cover
            "
                    />

                    <ChevronDown size={16} />
                </button>

                {/* ================= DROPDOWN ================= */}
                {open && (
                    <div
                        className="
              absolute right-0 mt-3
              w-48
              bg-white text-gray-800
              rounded-xl shadow-xl border
              overflow-hidden
              animate-fadeIn
            "
                    >
                        <button
                            onClick={() => {
                                setOpen(false);
                                navigate("/admin/profile");
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-purple-50"
                        >
                            Profile
                        </button>

                        <button className="flex items-center gap-2 w-full px-4 py-3 hover:bg-gray-100 text-sm">
                            <Settings size={16} />
                            Settings
                        </button>

                        <button
                            onClick={() => dispatch(logoutUser())}
                            className="flex items-center gap-2 w-full px-4 py-3 text-red-600 hover:bg-red-50 text-sm"
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
