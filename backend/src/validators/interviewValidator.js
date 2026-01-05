import Joi from "joi";

export const startInterviewSchema = Joi.object({
  companyName: Joi.string().trim().min(1).max(50).required(),

  interviewType: Joi.string().valid("HR", "domain-specific").required(),

  hrRoundType: Joi.when("interviewType", {
    is: "HR",
    then: Joi.string()
      .valid("screening", "situational", "stress", "behavioral", "cultural-fit")
      .required(),
    otherwise: Joi.forbidden(),
  }),

  inputType: Joi.when("interviewType", {
    is: "domain-specific",
    then: Joi.string().valid("job-description", "skills-based").required(),
    otherwise: Joi.forbidden(),
  }),

  jobDescription: Joi.when("inputType", {
    is: "job-description",
    then: Joi.string().min(100).max(2000).required(),
    otherwise: Joi.optional(),
  }).when("interviewType", {
    is: "HR",
    then: Joi.forbidden(),
  }),

  skills: Joi.when("inputType", {
    is: "skills-based",
    then: Joi.array().items(Joi.string()).min(3).max(5).required(),
    otherwise: Joi.optional(),
  }).when("interviewType", {
    is: "HR",
    then: Joi.forbidden(),
  }),

  domain: Joi.when("interviewType", {
    is: "domain-specific",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),

  jobRole: Joi.when("interviewType", {
    is: "domain-specific",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
});

export const postAnswerSchema = Joi.object({
  answer: Joi.string().min(14).max(1500).required(),
});

export const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string().length(24).hex().required(),
});
