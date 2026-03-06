// Unicode Private Use Area characters as continuation markers.
// These characters are never produced by keyboards, fonts, or normal text
// processing. They exist specifically for application-internal use.
// The marker is invisible to humans but machine-parseable.
// Your frontend inserts it at the cursor position before sending to the agent.

export const CONTINUE_MARKER = '\uE000';

export const MARKERS = {
  CONTINUE: '\uE000', // write new content here
  REWRITE_START: '\uE001', // start of region to rewrite
  REWRITE_END: '\uE002', // end of region to rewrite
  ENHANCE_START: '\uE003', // start of region to enhance
  ENHANCE_END: '\uE004', // end of region to enhance
  DELETE_START: '\uE005', // start of region to delete
  DELETE_END: '\uE006', // end of region to delete
  COMMENT: '\uE007', // inline comment/instruction follows
} as const;

export type MarkerName = keyof typeof MARKERS;
