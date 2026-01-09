import { Outlet } from "react-router-dom";
import Header from "./Header";
import BottomNav from "@/components/BottomNav";

const Layout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main 
        className="flex-1 overflow-y-auto pb-24 pt-14"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3.5rem)" }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
