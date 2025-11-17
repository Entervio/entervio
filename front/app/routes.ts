import { type RouteConfig, index, route } from "@react-router/dev/routes";


export default [
  index("routes/_index.tsx"),
  route("setup", "routes/setup.tsx"),
  route("interviews", "routes/interviews.tsx"),
  route("account", "routes/account.tsx"),
  route("interview/:interviewId", "routes/interview.tsx"),
  route("interview/:interviewId/feedback", "routes/feedback.tsx")
] satisfies RouteConfig;