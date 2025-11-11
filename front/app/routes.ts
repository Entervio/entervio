import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/setup.tsx"),
  route("interview", "routes/interview.tsx"),
] satisfies RouteConfig;