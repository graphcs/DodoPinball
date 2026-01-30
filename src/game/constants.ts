// ---- Table Dimensions ----
export const TABLE_WIDTH = 5.0;
export const TABLE_LENGTH = 10.0;
export const TABLE_TILT_DEGREES = 6.5;
export const WALL_HEIGHT = 0.6;
export const WALL_THICKNESS = 0.15;
export const PLAYFIELD_THICKNESS = 0.2;

// ---- Ball ----
export const BALL_RADIUS = 0.13;
export const BALL_MASS = 0.08;
export const BALL_RESTITUTION = 0.4;
export const BALL_FRICTION = 0.2;
export const BALL_LINEAR_DAMPING = 0.3;
export const BALL_ANGULAR_DAMPING = 0.1;

// ---- Flippers ----
export const FLIPPER_LENGTH = 0.8;
export const FLIPPER_WIDTH = 0.15;
export const FLIPPER_HEIGHT = 0.15;
export const FLIPPER_REST_ANGLE = -0.45; // radians from center
export const FLIPPER_MAX_ANGLE = 0.45;
export const FLIPPER_SPEED = 25; // radians per second
export const FLIPPER_Y = 0.1;

// ---- Plunger ----
export const PLUNGER_MAX_PULL = 0.8;
export const PLUNGER_CHARGE_SPEED = 2.5;
export const PLUNGER_LAUNCH_SPEED = 18; // max ball speed in -Z (m/s)
export const PLUNGER_WIDTH = 0.2;
export const PLUNGER_HEIGHT = 0.5;

// ---- Bumpers ----
export const BUMPER_RADIUS = 0.25;
export const BUMPER_HEIGHT = 0.3;
export const BUMPER_IMPULSE = 5.0;
export const BUMPER_SCORE = 100;

// ---- Slingshots ----
export const SLINGSHOT_IMPULSE = 3.0;
export const SLINGSHOT_SCORE = 10;

// ---- Drop Targets ----
export const DROP_TARGET_WIDTH = 0.3;
export const DROP_TARGET_HEIGHT = 0.25;
export const DROP_TARGET_DEPTH = 0.08;
export const DROP_TARGET_SCORE = 500;
export const DROP_TARGET_BANK_BONUS = 10000;

// ---- Spinner ----
export const SPINNER_SCORE = 10;

// ---- Rollover Lanes ----
export const ROLLOVER_SCORE = 200;
export const ROLLOVER_COMPLETE_BONUS = 5000;

// ---- Ramp ----
export const RAMP_SCORE = 2000;

// ---- Scoring ----
export const INITIAL_BALLS = 3;
export const MAX_MULTIPLIER = 5;
export const EXTRA_BALL_THRESHOLD = 50000;

// ---- Physics ----
export const PHYSICS_TIMESTEP = 1 / 120;
export const GRAVITY_X = 0;
export const GRAVITY_Y = -9.81 * Math.sin(TABLE_TILT_DEGREES * Math.PI / 180);
export const GRAVITY_Z = -9.81 * Math.cos(TABLE_TILT_DEGREES * Math.PI / 180) * Math.sin(TABLE_TILT_DEGREES * Math.PI / 180);

// The table is laid out in XZ plane. Y is up.
// Gravity has a component pulling the ball "down" the table (negative Z)
// and a small component pulling it into the playfield surface (negative Y).
// For a tilted table:
export const TABLE_GRAVITY = {
  x: 0,
  y: -9.81 * Math.cos(TABLE_TILT_DEGREES * Math.PI / 180),
  z: 9.81 * Math.sin(TABLE_TILT_DEGREES * Math.PI / 180),
};

// ---- Launch Lane ----
export const LAUNCH_LANE_X = TABLE_WIDTH / 2 - 0.35;
export const LAUNCH_LANE_WIDTH = 0.5;
