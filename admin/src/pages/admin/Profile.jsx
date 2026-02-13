import { useSelector } from "react-redux";
import AdminLayout from "../../components/layout/AdminLayout";
import {
    Mail,
    Phone,
    Shield,
    CheckCircle,
    Calendar,
    User
} from "lucide-react";

export default function Profile() {
    const { user } = useSelector((s) => s.auth);

    if (!user) return null;

    const fullName = user?.profile?.fullName || "Admin";

    const avatar =
        user?.profile?.avatar?.url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
            fullName
        )}&background=6A1B9A&color=fff`;

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto space-y-8">

                {/* ================= HEADER CARD ================= */}
                <div className="bg-white rounded-2xl shadow p-8 flex items-center gap-6">

                    <img
                        src={avatar}
                        alt="avatar"
                        className="w-28 h-28 rounded-full object-cover border-4 border-purple-100"
                    />

                    <div className="flex-1">
                        <h2 className="text-2xl font-semibold text-gray-800">
                            {fullName}
                        </h2>

                        <p className="text-gray-500 text-sm mt-1">
                            System Administrator
                        </p>

                        <div className="flex gap-3 mt-3">

                            {user.isAdmin && (
                                <span className="bg-purple-100 text-purple-700 px-3 py-1 text-xs rounded-full font-medium">
                                    Admin
                                </span>
                            )}

                            {user.isActive && (
                                <span className="bg-green-100 text-green-700 px-3 py-1 text-xs rounded-full font-medium">
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                </div>


                {/* ================= INFO GRID ================= */}
                <div className="grid md:grid-cols-2 gap-6">

                    <InfoCard
                        icon={<Mail size={18} />}
                        label="Email"
                        value={user.email}
                    />

                    <InfoCard
                        icon={<Phone size={18} />}
                        label="Phone"
                        value={user.phone}
                    />

                    <InfoCard
                        icon={<Shield size={18} />}
                        label="Role"
                        value={user.profile?.role}
                    />

                    <InfoCard
                        icon={<CheckCircle size={18} />}
                        label="Email Verified"
                        value={user.isVerified?.email ? "Yes" : "No"}
                    />

                    <InfoCard
                        icon={<Calendar size={18} />}
                        label="Joined"
                        value={new Date(user.createdAt).toLocaleDateString()}
                    />

                    <InfoCard
                        icon={<User size={18} />}
                        label="User ID"
                        value={user._id}
                    />
                    {/* <InfoCard
  icon={<CheckCircle size={18} />}
  label="Phone Verified"
  value={user.isVerified?.phone ? "Yes" : "No"}
/>

<InfoCard
  icon={<Shield size={18} />}
  label="2FA Enabled"
  value={user.twoFactorAuth?.enabled ? "Yes" : "No"}
/>

<InfoCard
  icon={<Shield size={18} />}
  label="Has Registered"
  value={user.hasRegistered ? "Yes" : "No"}
/>

<InfoCard
  icon={<Shield size={18} />}
  label="Token Version"
  value={user.tokenVersion}
/>

<InfoCard
  icon={<Calendar size={18} />}
  label="Last Active"
  value={new Date(user.lastActive).toLocaleString()}
/>

<InfoCard
  icon={<Calendar size={18} />}
  label="Updated"
  value={new Date(user.updatedAt).toLocaleString()}
/>

<InfoCard
  icon={<User size={18} />}
  label="Bio"
  value={user.profile?.bio}
/>

<InfoCard
  icon={<User size={18} />}
  label="Location"
  value={`${user.profile?.location?.city || ""} ${user.profile?.location?.country || ""}`}
/>

<InfoCard
  icon={<User size={18} />}
  label="Interests"
  value={user.interests?.join(", ")}
/>

<InfoCard
  icon={<User size={18} />}
  label="Badges"
  value={user.badges?.join(", ")}
/>

<InfoCard
  icon={<User size={18} />}
  label="Emergency Contacts"
  value={user.safety?.emergencyContacts?.length}
/>

<InfoCard
  icon={<User size={18} />}
  label="Program Progress"
  value={user.programProgress?.length}
/> */}

                </div>
            </div>
        </AdminLayout>
    );
}


/* ============================================================
   REUSABLE CARD
============================================================ */
function InfoCard({ icon, label, value }) {
    return (
        <div className="bg-white rounded-xl shadow p-5 flex items-start gap-4">

            <div className="text-purple-600 mt-1">
                {icon}
            </div>

            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-800 break-all">
                    {value || "-"}
                </p>
            </div>
        </div>
    );
}
