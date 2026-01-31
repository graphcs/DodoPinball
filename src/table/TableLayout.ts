import { TABLE_WIDTH, TABLE_LENGTH, LAUNCH_LANE_X, LAUNCH_LANE_WIDTH } from '../game/constants';

const HW = TABLE_WIDTH / 2;
const HL = TABLE_LENGTH / 2;

// All positions are in the XZ plane, Y is up
export const TableLayout = {
  // Playfield
  playfield: {
    position: { x: 0, y: -0.1, z: 0 },
    halfExtents: { x: HW, y: 0.1, z: HL },
  },

  // Walls - [position, halfExtents, rotation?]
  walls: [
    // Left wall
    { pos: { x: -HW, y: 0.3, z: 0 }, half: { x: 0.075, y: 0.3, z: HL } },
    // Right wall (before launch lane)
    { pos: { x: HW, y: 0.3, z: 0 }, half: { x: 0.075, y: 0.3, z: HL } },
    // Top wall
    { pos: { x: 0, y: 0.3, z: -HL }, half: { x: HW, y: 0.3, z: 0.075 } },
    // Bottom wall (with drain gap in center)
    { pos: { x: -HW / 2 - 0.5, y: 0.3, z: HL }, half: { x: HW / 2 - 0.5, y: 0.3, z: 0.075 } },
    { pos: { x: HW / 2 + 0.5, y: 0.3, z: HL }, half: { x: HW / 2 - 0.5, y: 0.3, z: 0.075 } },

  ],

  // Drain sensor (below bottom opening)
  drain: {
    position: { x: 0, y: -0.5, z: HL + 0.5 },
    halfExtents: { x: HW, y: 0.5, z: 0.5 },
  },

  // Flipper positions
  flippers: {
    left: { x: -1.2, z: HL - 0.4 },
    right: { x: 1.2, z: HL - 0.4 },
  },

  // Plunger position
  plunger: {
    x: LAUNCH_LANE_X - 0.1,
    z: HL - 1.9,
  },

  // Ball start (in launch lane, Y above the launch path surface)
  ballStart: {
    x: LAUNCH_LANE_X,
    y: 0.2,
    z: HL - 2.5,
  },

  // Bumper positions
  bumpers: [
    { x: -0.6, z: -1.0, color: 0xff4400, score: 200 },
    { x: 0.6, z: -0.2, color: 0xff0044, score: 400 },
    { x: 0.0, z: -2.0, color: 0xff4400, score: 600 },
  ],

  // Slingshot vertices (triangular kickers above flippers)
  slingshots: {
    left: [
      { x: -1.5, z: HL - 2.5 },
      { x: -1.5, z: HL - 1.3 },
      { x: -0.8, z: HL - 1.3 },
    ],
    right: [
      { x: 1.5, z: HL - 2.5 },
      { x: 1.5, z: HL - 1.3 },
      { x: 0.8, z: HL - 1.3 },
    ],
  },

  // Drop targets (horizontal bank)
  dropTargets: [
    { x: -0.8, z: -1.0 },
    { x: -0.4, z: -1.0 },
    { x: 0.0, z: -1.0 },
    { x: 0.4, z: -1.0 },
    { x: 0.8, z: -1.0 },
  ],

  // Spinner
  spinner: { x: -0.8, z: -0.2 },

  // Rollover lanes
  rolloverLanes: [
    { x: -0.5, z: -4.0 },
    { x: 0.0, z: -4.0 },
    { x: 0.5, z: -4.0 },
  ],

  // Ramp
  ramp: {
    startX: 1.0,
    startZ: 0.0,
    endX: 0.5,
    endZ: -3.5,
    height: 0.4,
  },
};
