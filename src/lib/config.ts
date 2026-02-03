/**
 * Configuration constants for the trust score calculation
 */

// Number of "virtual" prior votes at 50% to prevent wild swings with few votes
// Higher = more stable scores, slower to change
export const PRIOR_STRENGTH = 20;

// Number of days for vote weight to decay by half
// Lower = recent votes matter more, older votes fade faster
export const HALF_LIFE_DAYS = 7;

// Default score when no votes exist (with prior, this is always 50)
export const DEFAULT_SCORE = 50;
