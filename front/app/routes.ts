import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  layout("routes/protected.tsx", [
    index("routes/_index.tsx"),
    route("setup", "routes/setup.tsx"),
    route("account", "routes/account.tsx"),
    route("interview/:interviewId", "routes/interview.tsx"),
    route("interview/:interviewId/feedback", "routes/feedback.tsx"),
    route("interviews", "routes/interviews.tsx", [
      index("routes/interviews._index.tsx"),
      route(":interviewId", "routes/InterviewFeedback.tsx"),
    ]),
  ]),
] satisfies RouteConfig;