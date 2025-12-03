import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("resume", "routes/resume.tsx"),
  layout("routes/protected.tsx", [
    index("routes/_index.tsx"),
    route("setup", "routes/setup.tsx"),
    route("account", "routes/account.tsx"),
    route("interviews", "routes/interviews.tsx", [
      index("routes/interviews._index.tsx"),
      route(":interviewId", "routes/InterviewFeedback.tsx"),
    ]),
    route("interview/:interviewId", "routes/interview.tsx"),
    route("interview/:interviewId/feedback", "routes/feedback.tsx"),
    route("jobs", "routes/jobs/layout.tsx", [
      index("routes/jobs/search.tsx"),
    ]),
  ]),
] satisfies RouteConfig;