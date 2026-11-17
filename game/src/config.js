// PROMISE — config: tuning, story text, and shared constants.
// All values here are the single source of truth for physics, story,
// and HUD text. Levels read the physics numbers; the dossier checker
// in tools/ reads them too, so a tuning change stays consistent.
export const TILE = 40;
export const VIEW_W = 960;
export const VIEW_H = 540;
export const GRAVITY = 1900;
export const RUN_SPEED = 270;
export const RUN_ACCEL = 2600;
export const AIR_ACCEL = 1800;
export const JUMP_VEL = -640;
export const DOUBLE_JUMP_VEL = -560;
export const MAX_FALL = 920;
export const COYOTE_TIME = 0.09;
export const JUMP_BUFFER = 0.12;
export const JUMP_CUT = 0.45;
export const PLAYER_W = 22;
export const PLAYER_H = 34;
export const RESPAWN_MS = 350;
export const LEVEL_COUNT = 12;

export const ZONES = [
  {
    name: 'Kaki Bukit',
    english: 'The Foot of the Hill',
    card: 'The foot of Bukit Senja. One dawn. One climb. Darma carries Ratna\u2019s ashes \u2014 and a promise.',
    sky: ['#2b3a67', '#e8836b', '#f7c873'],
    ground: '#5a4632',
  },
  {
    name: 'Hutan Senja',
    english: 'The Dusk Forest',
    card: 'The dusk forest. The wind remembers her laugh. The branches remember her name.',
    sky: ['#1d2b4a', '#7a4a6e', '#e88a5a'],
    ground: '#3d4a2e',
  },
  {
    name: 'Puncak',
    english: 'The Peak',
    card: 'The peak. The sky is turning gold. Almost there, Ratna. Almost.',
    sky: ['#241a3d', '#c65a7a', '#ffd98a'],
    ground: '#4a3a4a',
  },
];

export const RATNA_LINES = [
  'Get up, Darma. The sun is almost up.',
  'Not yet. You promised.',
  'One more step. I\u2019m waiting.',
  'Your knees are old. Your promise isn\u2019t.',
  'Again, my love. The dawn won\u2019t wait.',
];

export const DARMA_BARKS = [
  'For you, Ratna.',
  'Still climbing.',
  'One more ridge.',
];

export const LEVEL_NAMES = [
  'First Steps', 'Thorns at Dawn', 'Second Wind', 'The Old Path',
  'Wind in the Pines', 'Falling Branches', 'The Hollow', 'Dusk Deepens',
  'Loose Stone', 'The Gust', 'Almost There', 'Sunrise Peak',
];

export const LEVEL_INTROS = [
  'Move with A / D or arrows. Jump with Space, W, or Up. You can jump twice \u2014 your second wind.',
  'The thorns are patient. Watch where you land.',
  'Your legs are old, but your promise gives you one more push. Press jump again in the air.',
  'Some stones crumble under an old man\u2019s weight. Keep moving.',
  'The wind pushes. Lean into it, or be carried.',
  'Branches fall where the forest is thickest. Listen.',
  'The hollow sways. Ride the old platforms across.',
  'Dusk deepens. Every step is a little harder now.',
  'Loose stone. Nothing here holds for long.',
  'The gust wants you back down the hill. It will not have you.',
  'Everything at once. Breathe. One jump at a time.',
  'The sun is rising. Climb, Darma. Climb.',
];

export const MEMORY_LINES = [
  'The first time we met, you were mending nets under this same sky.',
  'She laughed at your crooked boat and married you anyway.',
  'Fifty years of dawns, and she never once let you climb alone.',
  'Her hand on your shoulder, steady as the tide.',
  'She hummed while the wind combed the pines.',
  'A branch fell once, and she caught it laughing.',
  'In the hollow, she taught you to listen to the forest.',
  'Dusk was her favourite hour \u2014 \u201cthe day saying thank you.\u201d',
  'She said the mountain only tests those it loves.',
  'Her scarf, caught by the wind, flew like a prayer.',
  'One more ridge, she would say. Just one more.',
  'At the top, she waited \u2014 in every sunrise since.',
];

export const ENDING_CARD =
  'The sun rises. The ashes scatter on the wind. Darma sits down beside the memory of her \u2014 and finally, peacefully, rests. The promise is kept.';
export const ENDING_SUB = 'PROMISE \u2014 a promise before sunrise';
