// All drawing lives here: the title screen, the duel table, the win and loss
// screens, and every card. Nothing is an image — cards, sigil glyphs and bars are
// drawn with canvas paths, so the game needs no asset files at all.
import { ELEMENTS, effectLabel } from './deck.js';
import { effectivePower } from './state.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 800;

const CARD_WIDTH = 150;
const CARD_HEIGHT = 210;
const HAND_Y = 560;
const TABLE_Y = 300;
const FOE_HAND_Y = 96;

const BG_TOP = '#1d130c';
const BG_BOTTOM = '#0b0705';
const GOLD = '#f5c542';
const INK = '#f3e9d2';
const MUTED = '#b8a888';

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/** The sigil glyph for an element, drawn in the middle of a card. */
function drawGlyph(ctx, element, cx, cy, size) {
  const color = ELEMENTS[element].color;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineJoin = 'round';
  if (element === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.bezierCurveTo(size * 0.5, -size * 0.1, size * 0.42, size * 0.35, size * 0.18, size * 0.5);
    ctx.bezierCurveTo(size * 0.05, size * 0.28, -size * 0.12, size * 0.28, -size * 0.1, size * 0.5);
    ctx.bezierCurveTo(-size * 0.45, size * 0.3, -size * 0.42, -size * 0.2, 0, -size * 0.55);
    ctx.fill();
  } else if (element === 'tide') {
    for (let row = -1; row <= 1; row += 1) {
      ctx.beginPath();
      const y = row * size * 0.28;
      ctx.moveTo(-size * 0.5, y);
      ctx.quadraticCurveTo(-size * 0.25, y - size * 0.22, 0, y);
      ctx.quadraticCurveTo(size * 0.25, y + size * 0.22, size * 0.5, y);
      ctx.stroke();
    }
  } else if (element === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.quadraticCurveTo(size * 0.55, -size * 0.1, 0, size * 0.55);
    ctx.quadraticCurveTo(-size * 0.55, -size * 0.1, 0, -size * 0.55);
    ctx.fill();
    ctx.strokeStyle = BG_BOTTOM;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.45);
    ctx.lineTo(0, size * 0.45);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(0, size * 0.55);
    ctx.lineTo(-size * 0.45, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BG_BOTTOM;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.28);
    ctx.lineTo(size * 0.22, 0);
    ctx.lineTo(0, size * 0.28);
    ctx.lineTo(-size * 0.22, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** One face-up card. `dim` greys out cards the player cannot afford. */
function drawCard(ctx, card, x, y, width, height, options = {}) {
  const element = ELEMENTS[card.element];
  const power = options.power ?? card.power;
  const selected = options.selected ?? false;
  const dim = options.dim ?? false;
  const scale = width / CARD_WIDTH;

  ctx.save();
  if (selected) {
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 24;
  }
  roundRect(ctx, x, y, width, height, 14 * scale);
  ctx.fillStyle = dim ? '#3a332b' : '#fbf3df';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = selected ? 4 : 2;
  ctx.strokeStyle = selected ? GOLD : element.dark;
  ctx.stroke();

  // Element band with the element name.
  roundRect(ctx, x + 4, y + 4, width - 8, 30 * scale, 10 * scale);
  ctx.fillStyle = element.color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(15 * scale)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(element.name.toUpperCase(), x + width / 2, y + 20 * scale);

  drawGlyph(ctx, card.element, x + width / 2, y + height * 0.42, 52 * scale);

  // Power: the big number the duel is decided on.
  ctx.fillStyle = '#1c1410';
  ctx.font = `bold ${Math.round(52 * scale)}px Georgia, serif`;
  ctx.fillText(String(power), x + width / 2, y + height * 0.72);

  // Name and effect at the bottom.
  ctx.font = `bold ${Math.round(15 * scale)}px system-ui, sans-serif`;
  ctx.fillText(card.name, x + width / 2, y + height - 34 * scale);
  const label = effectLabel(card.effect);
  if (label) {
    ctx.font = `${Math.round(11 * scale)}px system-ui, sans-serif`;
    ctx.fillStyle = element.dark;
    ctx.fillText(label, x + width / 2, y + height - 16 * scale);
  }

  // Cost pips, tucked under the element band so they never touch the name.
  for (let i = 0; i < card.cost; i += 1) {
    ctx.beginPath();
    ctx.arc(x + 16 * scale + i * 18 * scale, y + 48 * scale, 6 * scale, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  return { x, y, width, height };
}

/** A face-down card: the back every hand hides behind. */
function drawCardBack(ctx, x, y, width, height) {
  const scale = width / CARD_WIDTH;
  roundRect(ctx, x, y, width, height, 14 * scale);
  ctx.fillStyle = '#2a1c12';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#7a5a2e';
  ctx.stroke();
  roundRect(ctx, x + 8, y + 8, width - 16, height - 16, 10 * scale);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawGlyph(ctx, 'stone', x + width / 2, y + height / 2, 44 * scale);
  ctx.fillStyle = GOLD;
  ctx.font = `bold ${Math.round(13 * scale)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText('EMBER', x + width / 2, y + height - 26 * scale);
}

function drawLifeBar(ctx, x, y, width, life, max, label, alignRight = false) {
  ctx.save();
  ctx.font = `bold 17px system-ui, sans-serif`;
  ctx.fillStyle = INK;
  ctx.textAlign = alignRight ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${label}  ${life} / ${max}`, alignRight ? x + width : x, y - 14);
  roundRect(ctx, x, y, width, 18, 9);
  ctx.fillStyle = '#3a2a1c';
  ctx.fill();
  const ratio = Math.max(0, life / max);
  if (ratio > 0) {
    roundRect(ctx, x, y, width * ratio, 18, 9);
    ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? GOLD : '#ef4444';
    ctx.fill();
  }
  ctx.restore();
}

function drawEnergy(ctx, x, y, energy, max) {
  ctx.save();
  ctx.font = `bold 15px system-ui, sans-serif`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Energy', x, y);
  for (let i = 0; i < max; i += 1) {
    ctx.beginPath();
    ctx.arc(x + 78 + i * 26, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = i < energy ? GOLD : '#3a2a1c';
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawHand(ctx, hand, y, width, height, selectedIndex, playerEnergy) {
  const gap = 12;
  const total = hand.length * width + (hand.length - 1) * gap;
  const startX = (VIEW_WIDTH - total) / 2;
  const boxes = [];
  hand.forEach((card, index) => {
    const lift = index === selectedIndex ? -18 : 0;
    const box = drawCard(ctx, card, startX + index * (width + gap), y + lift, width, height, {
      selected: index === selectedIndex,
      dim: card.cost > playerEnergy,
    });
    boxes.push(box);
  });
  return boxes;
}

/** Where the player's hand cards sit, so clicks can find them. */
export function handBoxes(hand) {
  const gap = 12;
  const total = hand.length * CARD_WIDTH + (hand.length - 1) * gap;
  const startX = (VIEW_WIDTH - total) / 2;
  return hand.map((_, index) => ({
    x: startX + index * (CARD_WIDTH + gap),
    y: HAND_Y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    index,
  }));
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function paintBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, BG_TOP);
    gradient.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    // Faint ember sparks drifting up the table.
    ctx.save();
    ctx.fillStyle = 'rgba(245, 197, 66, 0.10)';
    for (let i = 0; i < 24; i += 1) {
      const x = (i * 173 + 41) % VIEW_WIDTH;
      const y = (i * 97 + 53) % VIEW_HEIGHT;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function paintHeader(state, best) {
    ctx.save();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('EMBER SIGILS', 32, 34);
    ctx.fillStyle = MUTED;
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Round ${state.round}    Score ${state.player.score}    Best ${best}`, VIEW_WIDTH - 32, 34);
    ctx.restore();
  }

  function paintTable(state, ui) {
    const player = state.player;
    const foe = state.foe;
    // Rook, top of the table.
    drawLifeBar(ctx, 32, 66, 320, foe.life, 20, 'Rook — the Ember Warden');
    drawEnergy(ctx, 32, 108, foe.energy, 6);
    // Rook's hand, face down.
    const foeCount = foe.hand.length;
    const backWidth = 64;
    const backHeight = 90;
    const backTotal = foeCount * backWidth + (foeCount - 1) * 8;
    for (let i = 0; i < foeCount; i += 1) {
      drawCardBack(ctx, (VIEW_WIDTH - backTotal) / 2 + i * (backWidth + 8), FOE_HAND_Y, backWidth, backHeight);
    }

    // The two played cards, sliding in while the reveal runs.
    const reveal = ui.reveal ?? 1;
    const slide = (1 - reveal) * 120;
    if (state.table.foe) {
      drawCard(ctx, state.table.foe, 470, TABLE_Y - slide, CARD_WIDTH, CARD_HEIGHT, {
        power: effectivePower(state.table.foe, foe),
      });
      ctx.save();
      ctx.fillStyle = INK;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Rook plays', 545, TABLE_Y - slide - 14);
      ctx.restore();
    }
    if (state.table.player) {
      drawCard(ctx, state.table.player, 660, TABLE_Y + slide, CARD_WIDTH, CARD_HEIGHT, {
        power: effectivePower(state.table.player, player),
      });
      ctx.save();
      ctx.fillStyle = INK;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You play', 735, TABLE_Y + slide - 14);
      ctx.restore();
    }

    // The round's verdict, once the cards are on the table.
    if (state.lastRound && reveal >= 1) {
      const last = state.lastRound;
      let verdict = '';
      if (last.winner === 'player') verdict = `You win the round — Rook takes ${last.damageToFoe} damage`;
      else if (last.winner === 'foe') verdict = `Rook wins the round — you take ${last.damageToPlayer} damage`;
      else verdict = 'A tie — no damage either way';
      if (last.playerResonance) verdict += '  ·  Resonance +2!';
      ctx.save();
      ctx.fillStyle = last.winner === 'player' ? '#4ade80' : last.winner === 'foe' ? '#f87171' : MUTED;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(verdict, VIEW_WIDTH / 2, TABLE_Y + CARD_HEIGHT + 34);
      ctx.restore();
    } else if (state.table.player === null) {
      ctx.save();
      ctx.fillStyle = MUTED;
      ctx.font = '18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Choose a card — click it, or press 1–5. Same element twice in a row: Resonance +2.', VIEW_WIDTH / 2, TABLE_Y + 110);
      ctx.restore();
    }

    // The player, bottom of the table.
    drawLifeBar(ctx, 32, HAND_Y - 42, 320, player.life, 20, 'You');
    drawEnergy(ctx, 32, HAND_Y - 2, player.energy, 6);
    drawHand(ctx, player.hand, HAND_Y, CARD_WIDTH, CARD_HEIGHT, ui.selectedIndex ?? -1, player.energy);
    ctx.save();
    ctx.fillStyle = MUTED;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('Enter: start · P: pause · M: sound · R: restart', VIEW_WIDTH - 32, HAND_Y - 22);
    ctx.restore();
  }

  function paintOverlay(title, lines, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 3, 2, 0.72)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = accent;
    ctx.font = 'bold 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, VIEW_WIDTH / 2, 300);
    ctx.fillStyle = INK;
    ctx.font = '22px system-ui, sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, VIEW_WIDTH / 2, 380 + index * 36);
    });
    ctx.restore();
  }

  function paintTitle(state) {
    ctx.save();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 92px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EMBER SIGILS', VIEW_WIDTH / 2, 240);
    ctx.fillStyle = INK;
    ctx.font = '26px Georgia, serif';
    ctx.fillText('A duel of sigil cards against Rook, the Ember Warden', VIEW_WIDTH / 2, 310);
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillStyle = MUTED;
    const rules = [
      'Each round, play one card. Higher power wins the round; the loser takes the difference as damage.',
      'Same element as your last card: Resonance +2 power. Ward blocks damage. Tidecaller heals. Thornbloom surges energy.',
      'First to bring the other to 0 life wins. You have 20 life, Rook has 20 life.',
    ];
    rules.forEach((line, index) => ctx.fillText(line, VIEW_WIDTH / 2, 400 + index * 32));
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('Press Enter or click to begin', VIEW_WIDTH / 2, 540);
    ctx.fillStyle = MUTED;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Mouse or keys 1–5 to play a card · P pause · M sound · R restart', VIEW_WIDTH / 2, 580);
    // A fanned preview of the four sigils.
    const preview = ['flame', 'tide', 'leaf', 'stone'];
    preview.forEach((element, index) => {
      const card = { id: `preview-${element}`, name: ELEMENTS[element].name, element, power: 5 + index, cost: 2, effect: null };
      drawCard(ctx, card, 370 + index * 140, 606, 120, 168, {});
    });
    ctx.restore();
  }

  return {
    draw(state, screen, ui = {}) {
      ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      paintBackground();
      if (screen === SCREEN_TITLE) {
        paintTitle(state);
        return;
      }
      paintHeader(state, ui.best ?? 0);
      paintTable(state, ui);
      if (ui.flash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(239, 68, 68, ${ui.flash * 0.25})`;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        ctx.restore();
      }
      if (screen === SCREEN_PAUSED) {
        paintOverlay('PAUSED', ['Press P or Enter to keep duelling.'], GOLD);
      } else if (screen === SCREEN_WON) {
        paintOverlay('VICTORY', [
          'The Ember is yours — Rook bows out.',
          `Final score ${state.player.score} · ${state.round - 1} rounds played`,
          'Press R or Enter to duel again.',
        ], '#4ade80');
      } else if (screen === SCREEN_LOST) {
        paintOverlay('DEFEAT', [
          'The Ember fades — Rook keeps the table.',
          `Final score ${state.player.score} · ${state.round - 1} rounds played`,
          'Press R or Enter to try again.',
        ], '#f87171');
      }
    },
  };
}
