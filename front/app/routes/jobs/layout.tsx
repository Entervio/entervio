import { Outlet } from "react-router";

export default function JobsLayout() {
  return (
    <div className="h-full flex flex-col">
      <Outlet />
    </div>
  );
}
