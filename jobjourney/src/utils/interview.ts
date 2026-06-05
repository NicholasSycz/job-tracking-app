import { JobApplication, InterviewRound, InterviewOutcome } from '../types';

type InterviewLike = Pick<
  JobApplication,
  'id' | 'interviews' | 'interviewDate' | 'interviewOutcome' | 'interviewNotes'
>;

/**
 * Normalized list of interview rounds for an application.
 * Falls back to the legacy single-interview fields (as one round) for
 * applications that predate the multi-round model and haven't been migrated.
 */
export const getInterviews = (app: InterviewLike): InterviewRound[] => {
  if (app.interviews && app.interviews.length > 0) {
    return app.interviews.filter(r => r.scheduledAt);
  }
  if (app.interviewDate) {
    return [{
      id: app.id,
      type: '',
      scheduledAt: app.interviewDate,
      outcome: app.interviewOutcome,
      notes: app.interviewNotes,
    }];
  }
  return [];
};

/** An application counts as an interview when it has at least one scheduled round. */
export const hasInterview = (app: InterviewLike): boolean => getInterviews(app).length > 0;

/** Earliest scheduled round date (ISO string), or null when there are no rounds. */
export const earliestInterviewDate = (app: InterviewLike): string | null => {
  const rounds = getInterviews(app);
  if (rounds.length === 0) return null;
  return rounds.reduce((earliest, r) =>
    new Date(r.scheduledAt).getTime() < new Date(earliest).getTime() ? r.scheduledAt : earliest,
    rounds[0].scheduledAt
  );
};

/** Outcome of the latest-dated round, used as the application's representative outcome. */
export const latestOutcome = (app: InterviewLike): InterviewOutcome | undefined => {
  const rounds = getInterviews(app);
  if (rounds.length === 0) return undefined;
  const latest = rounds.reduce((a, b) =>
    new Date(b.scheduledAt).getTime() >= new Date(a.scheduledAt).getTime() ? b : a
  );
  return latest.outcome;
};
