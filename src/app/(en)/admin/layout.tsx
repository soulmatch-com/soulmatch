import AdminHeader from "@/components/admin/AdminHeader";
import { AdminSessionBootstrap } from "@/components/admin/AdminSessionBootstrap";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSessionBootstrap />
      <AdminHeader />
      <main>{children}</main>
    </div>
  );
}
