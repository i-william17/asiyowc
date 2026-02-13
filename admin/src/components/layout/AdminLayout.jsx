import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header */}
      <Header />

      {/* Content area */}
      <div className="pt-16">

        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main className="p-6 ml-64">
          {children}
        </main>

      </div>
    </div>
  );
}
