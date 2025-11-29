import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("setup", "routes/setup.tsx"),
  route("account", "routes/account.tsx"),
  route("interview/:interviewId", "routes/interview.tsx"),
  route("interview/:interviewId/feedback", "routes/feedback.tsx"),
  
  route("interviews", "routes/interviews.tsx", [
    index("routes/interviews._index.tsx"),
    route(":interviewId", "routes/InterviewFeedback.tsx"),
  ]),
] satisfies RouteConfig;