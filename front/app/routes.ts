import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("resume", "routes/resume.tsx"),
  layout("routes/protected.tsx", [
    index("routes/_index.tsx"),
    route("setup", "routes/setup.tsx"),
    route("account", "routes/account.tsx"),
    route("interviews", "routes/interviews.tsx"),
    route("interviews/:id", "routes/InterviewFeedback.tsx"),
    route("interview/:sessionId", "routes/interview.tsx"),
    route("feedback/:interviewId", "routes/feedback.tsx"),
  ]),
] satisfies RouteConfig;