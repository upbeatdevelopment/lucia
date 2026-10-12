import { test, expect } from '@playwright/test';

const main = '.game-card';
const piano = `${main} .piano`;
const keyName = (note) => `Piano key ${note.replaceAll('#', '♯')}`;
async function open(page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
}
async function dismissResult(page) {
  if (await page.locator('.answer-popup').isVisible()) await page.getByRole('button', { name: 'Close result' }).click();
}
async function openSettings(page) {
  await dismissResult(page);
  await closeStats(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.settings-drawer')).toBeVisible();
}
async function closeSettings(page) {
  if (await page.locator('.settings-drawer').isVisible()) await page.getByRole('button', { name: 'Close settings' }).click();
}
async function openStats(page) {
  await dismissResult(page);
  await closeSettings(page);
  await page.getByRole('button', { name: 'Stats', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Stats', exact: true })).toBeVisible();
}
async function closeStats(page) {
  if (await page.locator('.stats-drawer').isVisible()) await page.getByRole('button', { name: 'Close stats' }).click();
}
async function configure(page, direction = 'hear', mix) {
  await openSettings(page);
  await page.getByLabel('Exercise', { exact: true }).selectOption(direction);
  if (mix) await page.getByLabel('Practice mix').selectOption(mix);
  await closeSettings(page);
}
async function begin(page, direction = 'hear', mix) {
  await configure(page, direction, mix);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  if (direction === 'keys') await expect(page.locator('.key-selection')).toBeVisible();
  else await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
}
async function freeze(page) {
  await page.getByRole('button', { name: 'Pause session' }).click();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.locator('.answer-area').getByRole('button', { name: 'Resume', exact: true }).click();
}
async function answer(page) {
  if (await page.getByRole('textbox', { name: 'Your answer' }).count()) {
    const notes = await page.locator(`${piano} .selected`).evaluateAll((keys) => keys.map((key) => key.dataset.note));
    const root = await page.evaluate(async (notes) => {
      const { NOTES, voicing } = await import('/src/game.js');
      const pitchClasses = notes.map((note) => note.replace(/\d+$/, ''));
      return notes.length === 1 ? pitchClasses[0] : NOTES.find((root) => voicing(root, 'chords').every((note) => pitchClasses.includes(note.replace(/\d+$/, ''))));
    }, notes);
    expect(root).toBeTruthy();
    await page.getByRole('textbox', { name: 'Your answer' }).fill(root);
    await page.getByRole('textbox', { name: 'Your answer' }).press('Enter');
  } else {
    const prompt = (await page.locator('.challenge-heading h1').innerText()).replace(/^Play /, '').replaceAll('♯', '#');
    const root = prompt.match(/^[A-G]#?/)[0];
    const stage = await page.locator(main).getAttribute('data-stage');
    const inversion = prompt.includes('first') ? 1 : prompt.includes('second') ? 2 : 0;
    const notes = await page.evaluate(async ({ root, stage, inversion }) => (await import('/src/game.js')).voicing(root, stage, inversion), { root, stage, inversion });
    const compact = await page.locator(`${piano}.single`).count();
    for (const note of notes) await page.locator(main).getByRole('button', { name: keyName(compact ? note.replace(/\d+$/, '') + '4' : note), exact: true }).click();
  }
}
async function wrong(page) {
  await page.getByRole('textbox', { name: 'Your answer' }).fill('H');
  await page.getByRole('textbox', { name: 'Your answer' }).press('Enter');
  await expect(page.locator('.answer-popup')).toBeVisible();
}

test('stylesheet loads and fullscreen short-viewport controls are visible', async ({ page, request }) => {
  await page.setViewportSize({ width: 1905, height: 824 });
  const response = await request.get('/src/styles.css');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/css');
  await open(page);
  await expect(page.locator('.learning-path')).toHaveCount(0);
  await expect(page.locator('.stage-progress')).toContainText('Single notes');
  expect(await page.locator('.stage-progress').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(10);
  const container = await page.locator('.app-shell').boundingBox();
  expect(container).toMatchObject({ x: 0, y: 0, width: 1905, height: 824 });
  expect((await page.locator(piano).boundingBox()).width).toBe(1905);
  const timer = await page.getByRole('progressbar', { name: 'Question timer' }).boundingBox();
  const keys = await page.locator(`${piano} .piano-keys`).boundingBox();
  expect(timer.width).toBe(1905); expect(timer.height).toBeLessThanOrEqual(20);
  expect(timer.y + timer.height).toBeLessThanOrEqual(keys.y);
  await expect(page.locator('.countdown svg')).toHaveCount(0);
  await expect(page.locator(`${piano} .key-label`)).toHaveCount(0);
  await expect(page.locator(`${piano} .octave-number`)).toHaveText(['0', '1', '2', '3', '4', '5', '6', '7', '8']);
  const controls = await page.locator('.game-controls').boundingBox();
  expect(controls.y + controls.height).toBeLessThanOrEqual(824);
  await expect(page.locator('.game-controls').getByRole('button', { name: 'Replay' })).toHaveCount(0);
  await expect(page.getByLabel('Exercise', { exact: true })).toHaveValue('mixed');
  await page.screenshot({ path: '/tmp/piano-5174-styled.png', fullPage: false });
});

test('octave numbers sit above their key ranges in full and compact views', async ({ page }) => {
  await open(page);
  for (const viewport of [{ width: 1440, height: 1050 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const ranges = await page.locator(piano).evaluate((instrument) => {
      const keys = [...instrument.querySelectorAll('.white-key')];
      return [...instrument.querySelectorAll('.octave-number')].map((label) => {
        const matching = keys.filter((key) => key.dataset.note.endsWith(label.dataset.octave));
        const first = matching[0].getBoundingClientRect(), last = matching.at(-1).getBoundingClientRect();
        const guide = label.getBoundingClientRect();
        return { octave: label.textContent, guideLeft: guide.left, guideRight: guide.right, guideBottom: guide.bottom, keyLeft: first.left, keyRight: last.right, keyTop: first.top };
      });
    });
    expect(ranges.map((range) => range.octave)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8']);
    for (const range of ranges) {
      expect(Math.abs(range.guideLeft - range.keyLeft)).toBeLessThan(2);
      expect(Math.abs(range.guideRight - range.keyRight)).toBeLessThan(2);
      expect(range.guideBottom).toBeLessThanOrEqual(range.keyTop);
    }
    await expect(page.locator(`${piano} .key-label`)).toHaveCount(0);
    await page.screenshot({ path: `/tmp/piano-octave-guide-${viewport.width}.png`, fullPage: false });
  }
  await openSettings(page); await page.getByLabel('Keyboard view').selectOption('single'); await closeSettings(page);
  await expect(page.locator(`${piano} .octave-number`)).toHaveText(['4']);
  await expect(page.locator(`${piano} .key-label`)).toHaveCount(0);
  await page.screenshot({ path: '/tmp/piano-octave-guide-single.png', fullPage: false });
});

test('horizontal timer fills left to right, freezes paused, resets and reaches the deadline', async ({ page }) => {
  await open(page); await begin(page, 'keys', 'balanced'); await freeze(page);
  await answer(page);
  const timer = page.getByRole('progressbar', { name: 'Question timer' });
  const fill = page.locator('.timer-fill');
  await expect(fill).toHaveAttribute('style', 'width: 0%;');
  await expect(timer).toHaveAttribute('aria-valuemax', '8');
  await page.clock.runFor(2000);
  const percentage = () => fill.evaluate((element) => parseFloat(element.style.width));
  // The UI samples the deadline every 50ms; a frozen clock may stop just before its next tick.
  expect(Math.abs(await percentage() - 25)).toBeLessThanOrEqual(0.7);
  expect(Math.abs(Number(await timer.getAttribute('aria-valuenow')) - 2)).toBeLessThanOrEqual(0.06);
  expect(Math.abs(Number(await page.locator('.countdown strong').innerText()) - 6)).toBeLessThanOrEqual(0.15);
  const trackBox = await timer.boundingBox();
  const expectedWidth = trackBox.width * await percentage() / 100;
  await expect.poll(async () => Math.abs((await fill.boundingBox()).width - expectedWidth)).toBeLessThan(1);
  expect((await fill.boundingBox()).x).toBe(trackBox.x);
  await page.getByRole('button', { name: 'Pause session' }).click();
  const pausedStyle = await fill.getAttribute('style');
  await page.clock.runFor(5000);
  await expect(fill).toHaveAttribute('style', pausedStyle);
  await page.locator('.answer-area').getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(2000);
  expect(Math.abs(await percentage() - 50)).toBeLessThanOrEqual(0.7);
  await page.screenshot({ path: '/tmp/piano-horizontal-timer-half.png', fullPage: false });
  await answer(page);
  await expect(fill).toHaveAttribute('style', 'width: 0%;');
  await page.clock.runFor(6000);
  expect(Math.abs(await percentage() - 75)).toBeLessThanOrEqual(0.7);
  await expect(timer).toHaveClass(/urgent/);
  await page.clock.runFor(2050);
  await expect(fill).toHaveAttribute('style', 'width: 100%;');
  await expect(page.locator('.answer-popup')).toBeVisible();
  await expect(page.locator('.lesson-keyboard .octave-number')).toHaveText(['4']);
  await expect(page.locator('.lesson-keyboard .key-label')).toHaveCount(12);
  await expect(page.locator(`${piano} .key-label`)).toHaveCount(0);
});

test('all quiz parts and full 8/4/2 cycles, completion popup, SQLite history and chart', async ({ page, request }) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  await expect(page.locator(`${piano} button`)).toHaveCount(88);
  expect((await page.locator(piano).boundingBox()).width).toBe(1440);
  expect((await page.locator(`${piano} .piano-keys`).boundingBox()).height).toBe(525);
  await begin(page, 'hear', 'balanced');
  await freeze(page);
  const savedSession = page.waitForResponse((response) => response.url().endsWith('/api/sessions') && response.request().method() === 'POST');
  const parts = await page.evaluate(async () => (await import('/src/game.js')).QUIZ_PARTS);
  for (const [index, part] of parts.entries()) {
    for (const seconds of [8, 4, 2]) {
      await expect(page.locator(main)).toHaveAttribute('data-stage', part.stage);
      await expect(page.locator('.stage-progress')).toContainText(part.title);
      await expect(page.getByRole('progressbar', { name: 'Question timer' })).toHaveAttribute('aria-valuemax', String(seconds));
      if (index || seconds !== 8) await expect(page.locator('.countdown strong')).toHaveText(`${seconds}.0`);
      else expect(Number(await page.locator('.countdown strong').innerText())).toBeGreaterThan(6);
      const roots = new Set();
      for (let count = 0; count < part.roots.length; count++) {
        const keys = await page.locator(`${piano} .selected`).evaluateAll((keys) => keys.map((key) => key.dataset.note));
        if ([1, 3, 5].includes(index)) expect(keys.every((key) => !key.includes('#'))).toBe(true);
        if (part.stage === 'notes') roots.add(keys[0].replace(/\d+$/, ''));
        await answer(page);
      }
      if (part.stage === 'notes') expect(roots.size).toBe(12);
    }
    if (index === 3) await page.screenshot({ path: '/tmp/piano-inversions-dark.png', fullPage: false });
  }
  await expect(page.getByRole('dialog', { name: 'Quiz complete' })).toBeVisible();
  await expect(page.locator('.answer-popup .result-summary')).toContainText('171 correct');
  await expect(page.locator('.answer-popup button[data-note]:disabled')).toHaveCount(0);
  await page.locator('.answer-popup').getByRole('button', { name: keyName('C4'), exact: true }).click();
  await expect(page.locator('.answer-popup .result-summary')).toContainText('171 correct');
  await expect(page.locator('.game-card .result-summary, .game-card .score-value, .game-card .challenge-heading')).toHaveCount(0);
  const score = await page.locator('.score-value').innerText();
  const response = await savedSession; expect(response.status()).toBe(201);
  const data = await (await request.get('/api/history')).json();
  expect(data.sessions.find((session) => session.id === response.request().postDataJSON().id)).toMatchObject({ correct_answers: 171, end_reason: 'complete' });
  await page.clock.resume();
  await openStats(page);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  // Other tests advance their clock; the newest timestamp need not belong to this quiz.
  const completedRow = page.locator('.session-table tbody tr').filter({ has: page.getByRole('cell', { name: score, exact: true }) }).filter({ hasText: 'Completed' });
  await expect(completedRow).toContainText('171');
  await page.waitForFunction(() => { const c = document.querySelector('.chart-container canvas'); return c && c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((n) => n); });
  await page.locator('.chart-container').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/piano-history-chart.png', fullPage: false });
  await closeStats(page);
  await page.getByRole('button', { name: 'View result' }).click();
  await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.locator('.round-label > strong')).toHaveText('01');
  await page.reload();
  await expect(page.locator('.best-value')).toHaveText(score);
  expect(errors).toEqual([]);
});

test('default Mixed, Ctrl+Enter, centered note prompt and modal-only result', async ({ page, request }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await open(page);
  await openSettings(page);
  await expect(page.getByLabel('Exercise', { exact: true })).toHaveValue('mixed');
  await page.getByLabel('Practice mix').selectOption('balanced');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.round-label > strong')).toHaveText('01');
  await closeSettings(page);
  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
  await page.evaluate(() => { Math.random = () => 0.85; });
  await answer(page);
  await expect(page.locator('.challenge-heading h1')).toHaveText('Play A♯');
  await expect(page.locator(`${piano} .selected`)).toHaveCount(0);
  await expect(page.locator(`${piano} .octave-number`)).toHaveCount(9);
  await expect(page.locator(`${piano} .key-label`)).toHaveCount(0);
  const heading = await page.locator('.challenge-heading h1').boundingBox();
  expect(Math.abs(heading.x + heading.width / 2 - 720)).toBeLessThan(1);
  await page.screenshot({ path: '/tmp/piano-key-prompt.png', fullPage: false });
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/attempts') && r.request().method() === 'POST');
  await page.locator(main).getByRole('button', { name: keyName('A#5'), exact: true }).click();
  const response = await saved; expect(response.status()).toBe(201);
  await expect(page.locator('.feedback')).toHaveText('You played A♯5 — octave 5');
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
  const id = response.request().postDataJSON().id;
  const data = await (await request.get('/api/history')).json();
  expect(data.attempts.find((a) => a.id === id)).toMatchObject({ direction: 'keys', target: 'A#', answer: 'A#5', result: 'correct' });
  await page.screenshot({ path: '/tmp/piano-octave-feedback.png', fullPage: false });
  const nextNote = await page.locator(`${piano} .selected`).getAttribute('data-note');
  await wrong(page);
  await expect(page.locator('.answer-popup .answer-reveal strong')).toHaveText(nextNote.replace(/\d+$/, '').replaceAll('#', '♯'));
  await expect(page.locator('.game-card .challenge-heading')).toHaveCount(0);
  await expect(page.locator('.game-card').getByRole('button', { name: 'New session' })).toHaveCount(0);
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.answer-popup')).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
});

test('note-playing accepts low/high octaves, saves actual keys and teaches octave boundaries', async ({ page, request }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await open(page); await begin(page, 'keys', 'balanced');
  await freeze(page);
  for (const [note, target, octave] of [['C1', 'C', 1], ['C#7', 'C#', 7]]) {
    const saved = page.waitForResponse((r) => r.url().endsWith('/api/attempts') && r.request().method() === 'POST');
    await page.locator(main).getByRole('button', { name: keyName(note), exact: true }).click();
    await expect(page.locator('.feedback')).toHaveText(`You played ${note.replaceAll('#', '♯')} — octave ${octave}`);
    await expect(page.locator('.answer-popup')).not.toBeVisible();
    const response = await saved; expect(response.status()).toBe(201);
    const id = response.request().postDataJSON().id;
    const data = await (await request.get('/api/history')).json();
    expect(data.attempts.find((a) => a.id === id)).toMatchObject({ target, answer: note, direction: 'keys', result: 'correct' });
  }
  await page.screenshot({ path: '/tmp/piano-any-octave-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.feedback')).toHaveText('You played C♯7 — octave 7');
  const feedback = await page.locator('.feedback').boundingBox();
  expect(feedback.x).toBeGreaterThanOrEqual(0); expect(feedback.x + feedback.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: '/tmp/piano-any-octave-mobile.png', fullPage: false });
  await expect(page.locator('.challenge-heading h1')).toHaveText('Play D');
  await page.locator(main).getByRole('button', { name: keyName('E5'), exact: true }).click();
  await expect(page.locator('.answer-popup')).toBeVisible();
  await expect(page.locator('.answer-popup .answer-reveal strong')).toHaveText('D');
  await expect(page.locator('.lesson-details')).toContainText('Any D on the piano is valid');
  await expect(page.locator('.lesson-details')).toContainText('C3–B3 is octave 3');
  await page.screenshot({ path: '/tmp/piano-any-octave-lesson.png', fullPage: false });
});

test('response times exclude popup/drawer pauses, keep retries and survive reload', async ({ page, request }) => {
  await open(page); await configure(page, 'hear', 'balanced');
  await openSettings(page); await page.getByRole('switch', { name: 'End on wrong answer' }).uncheck(); await closeSettings(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused(); await freeze(page);
  const posted = () => page.waitForResponse((response) => response.url().endsWith('/api/attempts') && response.request().method() === 'POST');
  const initial = posted(); await answer(page); await initial;
  await page.clock.runFor(2000);
  const wrongSave = posted(); await wrong(page);
  const missed = (await wrongSave).request().postDataJSON();
  expect(missed.durationSeconds).toBe(8); expect(Math.abs(missed.responseSeconds - 2)).toBeLessThan(0.05);
  await page.clock.runFor(20000); await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.clock.runFor(1000); await openSettings(page); await page.clock.runFor(10000); await closeSettings(page);
  await page.locator('.answer-area').getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1000);
  const correctSave = posted(); await answer(page);
  const entry = (await correctSave).request().postDataJSON();
  expect(entry).toMatchObject({ result: 'correct', durationSeconds: 8 });
  expect(Math.abs(entry.responseSeconds - 4)).toBeLessThan(0.05);
  const data = await (await request.get('/api/history')).json();
  expect(data.timings.find((row) => row.id === entry.id)).toMatchObject({ response_seconds: entry.responseSeconds, duration_seconds: 8 });
  await page.clock.resume(); await openStats(page);
  const row = page.locator(`.timing-table tr[data-attempt-id="${entry.id}"]`);
  await expect(row).toContainText('4.00 s'); await expect(row).toContainText('Correct');
  await expect(page.getByRole('img', { name: 'Correct response times over practice attempts' })).toBeVisible();
  await page.reload(); await openStats(page);
  await expect(page.locator(`.timing-table tr[data-attempt-id="${entry.id}"]`)).toContainText('4.00 s');
});

test('hidden-tab pauses do not count toward response time or expire the question', async ({ page }) => {
  await open(page); await begin(page, 'hear', 'balanced'); await freeze(page);
  const posted = () => page.waitForResponse((response) => response.url().endsWith('/api/attempts') && response.request().method() === 'POST');
  const initial = posted(); await answer(page); await initial;
  await page.clock.runFor(2000);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(100);
  await expect(page.locator('.challenge-heading h1')).toHaveText('Paused');
  await page.clock.runFor(20000);
  await expect(page.locator('.answer-popup')).not.toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.locator('.answer-area').getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1000);
  const saved = posted(); await answer(page);
  const entry = (await saved).request().postDataJSON();
  expect(entry).toMatchObject({ result: 'correct', durationSeconds: 8 });
  expect(Math.abs(entry.responseSeconds - 3)).toBeLessThan(0.05);
});

test('queued attempt retries retain their original timing and timestamp', async ({ page, request }) => {
  await page.route('**/api/attempts', (route) => route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } }));
  await open(page); await begin(page, 'hear', 'balanced'); await freeze(page);
  await page.clock.runFor(1000);
  const rejected = page.waitForResponse((response) => response.url().endsWith('/api/attempts') && response.request().method() === 'POST');
  await answer(page);
  const failed = await rejected; await failed.finished();
  const original = failed.request().postDataJSON();
  await page.clock.runFor(100);
  await expect(page.getByRole('button', { name: 'Retry saves' })).toBeVisible();
  await page.clock.runFor(3000); await page.unroute('**/api/attempts');
  const retried = page.waitForResponse((response) => response.url().endsWith('/api/attempts') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Retry saves' }).click();
  const response = await retried; expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual(original);
  const data = await (await request.get('/api/history')).json();
  expect(data.timings.filter((row) => row.id === original.id)).toHaveLength(1);
  expect(data.timings.find((row) => row.id === original.id)).toMatchObject({ response_seconds: original.responseSeconds, duration_seconds: 8, completed_at: original.completedAt });
});

test('Stats has its own drawer, separates controls and safely pauses play', async ({ page }) => {
  await open(page); await openSettings(page);
  await expect(page.locator('.settings-drawer .best-value, .settings-drawer .drawer-score, .settings-drawer .history-control, .settings-drawer .progress-panel')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Quiz sound', exact: true })).toBeVisible();
  await closeSettings(page); await openStats(page);
  await expect(page.locator('.side-drawer[open]')).toHaveCount(1);
  await expect(page.locator('.stats-drawer .best-value')).toBeVisible();
  await expect(page.locator('.stats-drawer .settings-panel, .stats-drawer .drawer-playback, .stats-drawer .drawer-sound')).toHaveCount(0);
  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(page.locator('.stats-drawer')).not.toBeVisible();
  await begin(page, 'hear', 'balanced'); await freeze(page);
  const baseline = Number(await page.getByRole('progressbar', { name: 'Question timer' }).getAttribute('aria-valuenow'));
  await page.clock.runFor(1000); await openStats(page);
  await expect(page.locator('.challenge-heading h1')).toHaveText('Paused');
  const elapsed = await page.getByRole('progressbar', { name: 'Question timer' }).getAttribute('aria-valuenow');
  await page.clock.runFor(10000);
  await expect(page.getByRole('progressbar', { name: 'Question timer' })).toHaveAttribute('aria-valuenow', elapsed);
  await expect(page.getByRole('button', { name: 'Resume session' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('.stats-drawer')).not.toBeVisible();
  await expect(page.locator('.challenge-heading h1')).toHaveText('Paused');
  await openSettings(page); await expect(page.getByLabel('Exercise', { exact: true })).toBeDisabled();
  await closeSettings(page); await page.locator('.answer-area').getByRole('button', { name: 'Resume', exact: true }).click();
  const saved = page.waitForResponse((response) => response.url().endsWith('/api/attempts') && response.request().method() === 'POST');
  await page.clock.runFor(1000); await answer(page);
  const entry = (await saved).request().postDataJSON();
  expect(Math.abs(entry.responseSeconds - (baseline + 2))).toBeLessThan(0.1);
});

test('New session dismisses Stats when opening it races the question deadline', async ({ page }) => {
  await open(page); await begin(page, 'hear', 'balanced'); await freeze(page);
  // Expire the real deadline without allowing the next interval tick to run.
  await page.evaluate(() => { const now = performance.now.bind(performance); performance.now = () => now() + 9000; });
  await page.getByRole('button', { name: 'Stats', exact: true }).click();
  await expect(page.locator('.answer-popup')).toBeVisible();
  await expect(page.locator('.stats-drawer')).toBeVisible();
  await page.clock.resume();
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await expect(page.locator('.stats-drawer')).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
  await expect(page.locator('.round-label > strong')).toHaveText('01');
});

test('manual key audio works before play, in hear mode, paused, in popup and after finishing even with quiz mute', async ({ page }) => {
  const attempts = [];
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/api/attempts')) attempts.push(request.postDataJSON()); });
  await open(page);
  await page.evaluate(async () => { const Tone = await import('tone'); window.meter = new Tone.Meter({ smoothing: 0 }); Tone.getDestination().connect(window.meter); });
  const audition = async (container, note) => {
    await expect.poll(() => page.evaluate(() => window.meter.getValue())).toBeLessThan(-75);
    await container.getByRole('button', { name: keyName(note), exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.meter.getValue())).toBeGreaterThan(-60);
  };
  await expect(page.locator(`${piano} button:disabled`)).toHaveCount(0);
  await audition(page.locator(main), 'C4');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  expect(attempts).toHaveLength(0);
  await openSettings(page); await page.getByRole('switch', { name: 'Quiz sound', exact: true }).uncheck();
  await audition(page.locator(main), 'A4');
  await expect(page.locator('.settings-drawer')).toBeVisible(); await closeSettings(page);
  await openStats(page);
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
  await audition(page.locator(main), 'D4');
  await expect(page.locator('.stats-drawer')).toBeVisible(); await closeStats(page);
  await begin(page, 'hear', 'balanced');
  await audition(page.locator(main), 'F4');
  await expect(page.locator('.round-label > strong')).toHaveText('01'); expect(attempts).toHaveLength(0);
  await page.getByRole('button', { name: 'Pause session' }).click();
  const elapsed = await page.getByRole('progressbar', { name: 'Question timer' }).getAttribute('aria-valuenow');
  await audition(page.locator(main), 'G4');
  await expect(page.getByRole('progressbar', { name: 'Question timer' })).toHaveAttribute('aria-valuenow', elapsed);
  await expect(page.locator('.challenge-heading h1')).toHaveText('Paused'); expect(attempts).toHaveLength(0);
  await page.locator('.answer-area').getByRole('button', { name: 'Resume', exact: true }).click();
  const saved = page.waitForResponse((response) => response.url().endsWith('/api/attempts') && response.request().method() === 'POST');
  await wrong(page); await saved;
  await audition(page.locator('.answer-popup'), 'C4');
  expect(attempts).toHaveLength(1);
  await dismissResult(page); await audition(page.locator(main), 'B4');
  await expect(page.getByRole('button', { name: 'View result' })).toBeVisible(); expect(attempts).toHaveLength(1);
  await expect(page.locator('.correct-value')).toHaveText('0');
});

test('running key answers grade immediately without waiting for manual audio initialization', async ({ page }) => {
  await page.route('https://esm.sh/tone@15.1.22', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    export async function start() { if (window.holdAudio) await new Promise(resolve => { window.resumeAudio = resolve; }); }
    export class Synth {}
    export class PolySynth {
      toDestination() { window.playedNotes = []; return this; }
      triggerAttackRelease(notes) { window.playedNotes.push(notes); }
      releaseAll() {}
    }
    export function getContext() { return { state: 'running' }; }
    export function now() { return 0; }
  ` }));
  await page.addInitScript(() => { Math.random = () => 0; });
  await open(page); await openSettings(page); await page.getByRole('switch', { name: 'Quiz sound', exact: true }).uncheck(); await closeSettings(page);
  await begin(page, 'keys', 'balanced');
  await page.evaluate(() => { window.holdAudio = true; });
  const saved = page.waitForResponse((response) => response.url().endsWith('/api/attempts') && response.request().method() === 'POST');
  await page.locator(main).getByRole('button', { name: keyName('C4'), exact: true }).click();
  expect((await saved).request().postDataJSON()).toMatchObject({ result: 'correct', answer: 'C4' });
  await expect(page.locator('.round-label > strong')).toHaveText('02');
  expect(await page.evaluate(() => window.playedNotes)).toEqual([]);
  await page.evaluate(() => { window.holdAudio = false; window.resumeAudio(); });
  await expect.poll(() => page.evaluate(() => window.playedNotes)).toEqual([['C4']]);
});

test('Progress shows latest times and separate speed lines, filters phases and fits mobile', async ({ page }) => {
  const base = { session_id: 'progress-fixture', target: 'C#', stage: 'notes', inversion: 0, direction: 'hear', result: 'correct', response_seconds: 1.2, duration_seconds: 8 };
  const timings = Array.from({ length: 14 }, (_, index) => ({ ...base, id: `progress-${index}`, completed_at: new Date(Date.UTC(2026, 0, 1, 12, 0, 14 - index)).toISOString(), direction: index % 2 ? 'keys' : 'hear', response_seconds: index === 1 ? 8 : index === 13 ? 0 : 1.2 + index / 10, result: index === 1 ? 'timeout' : index === 2 ? 'wrong' : 'correct' }));
  timings.push({ ...base, id: 'major-time', completed_at: '2026-01-01T11:59:59.000Z', stage: 'chords', response_seconds: 2.5 }, { ...base, id: 'first-time', completed_at: '2026-01-01T11:59:58.000Z', stage: 'inversions', inversion: 1, response_seconds: 3.4 }, { ...base, id: 'second-time', completed_at: '2026-01-01T11:59:57.000Z', stage: 'inversions', inversion: 2, response_seconds: 3.8 });
  await page.route('**/api/history', (route) => route.fulfill({ json: { sessions: [], attempts: [], stats: [], practice: {}, timings } }));
  await open(page); await openStats(page);
  await expect(page.locator('.progress-panel')).toContainText('Latest times');
  await expect(page.locator('.timing-table tbody tr')).toHaveCount(10);
  await expect(page.locator('.timing-table')).toContainText('Timeout'); await expect(page.locator('.timing-table')).toContainText('Wrong');
  await page.waitForFunction(async () => { const { default: Chart } = await import('https://esm.sh/chart.js@4.4.7/auto'); return !!Chart.getChart(document.querySelector('.timing-chart canvas')); });
  const plotted = await page.evaluate(async () => { const { default: Chart } = await import('https://esm.sh/chart.js@4.4.7/auto'); const chart = Chart.getChart(document.querySelector('.timing-chart canvas')); return chart.data.datasets.map((dataset) => ({ label: dataset.label, values: dataset.data.filter((value) => value !== null) })); });
  expect(plotted.map((series) => series.label)).toEqual(['Hear → name', 'Name → keys']);
  expect(plotted.flatMap((series) => series.values)).toHaveLength(12);
  expect(plotted.flatMap((series) => series.values)).toContain(0);
  expect(plotted.flatMap((series) => series.values)).not.toContain(8);
  await page.locator('.progress-panel').evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: '/tmp/piano-timing-progress-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.progress-panel').evaluate((element) => element.scrollIntoView({ block: 'start' }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const chart = await page.locator('.timing-chart').boundingBox(); expect(chart.x).toBeGreaterThanOrEqual(0); expect(chart.x + chart.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '/tmp/piano-timing-progress-mobile.png', fullPage: false });
  for (const [phase, id] of [['chords', 'major-time'], ['first', 'first-time'], ['second', 'second-time']]) {
    await page.getByLabel('Progress phase').selectOption(phase);
    await expect(page.locator('.timing-table tbody tr')).toHaveCount(1);
    await expect(page.locator(`.timing-table tr[data-attempt-id="${id}"]`)).toBeVisible();
  }
  await page.getByLabel('Progress exercise').selectOption('keys');
  await expect(page.locator('.progress-panel')).toContainText('No timed attempts match');
});

test('Progress handles legacy empty history, server errors and unavailable charts', async ({ page }) => {
  await page.route('**/api/history', (route) => route.fulfill({ json: { sessions: [], attempts: [], stats: [], practice: {} } }));
  await open(page); await openStats(page);
  await expect(page.locator('.progress-panel')).toContainText('Timing starts with new practice');
  await closeStats(page); await page.unroute('**/api/history');
  await page.route('**/api/history', (route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await openStats(page); await expect(page.locator('.progress-panel [role=alert]')).toContainText('Progress is unavailable. Reopen Stats');
  await closeStats(page); await page.unroute('**/api/history');
  await page.route('**/api/history', (route) => route.fulfill({ json: { timings: [{ id: 'chart-failure', stage: 'notes', target: 'C', inversion: 0, direction: 'hear', result: 'correct', response_seconds: 1.5, duration_seconds: 8, completed_at: '2026-01-01T12:00:00.000Z' }] } }));
  await page.route('https://esm.sh/chart.js@4.4.7/auto', (route) => route.abort());
  await openStats(page);
  await expect(page.locator('.progress-panel [role=alert]')).toContainText('speed graph couldn’t load');
  await expect(page.locator('.timing-table')).toContainText('1.50 s');
});

test('retry popup pauses the timer; drawer sound/replay work while paused', async ({ page }) => {
  await open(page); await configure(page, 'hear', 'balanced');
  await openSettings(page); await page.getByRole('switch', { name: 'End on wrong answer' }).uncheck(); await closeSettings(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click(); await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
  await freeze(page);
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('.round-label > strong')).toHaveText('01');
  await wrong(page);
  const paused = await page.locator('.countdown strong').innerText();
  await page.clock.runFor(20000);
  await expect(page.locator('.countdown strong')).toHaveText(paused);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.clock.runFor(500);
  expect(Math.abs(Number(await page.locator('.countdown strong').innerText()) - (Number(paused) - 0.5))).toBeLessThanOrEqual(0.15);
  await openSettings(page);
  await expect(page.getByLabel('Practice mix')).toBeDisabled();
  await expect(page.getByRole('switch', { name: 'Quiz sound', exact: true })).toBeEnabled();
  const drawerTime = await page.locator('.countdown strong').innerText();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await page.clock.runFor(500);
  await expect(page.locator('.countdown strong')).toHaveText(drawerTime);
  await page.getByRole('switch', { name: 'Quiz sound', exact: true }).uncheck();
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeDisabled();
  await page.screenshot({ path: '/tmp/piano-drawer-desktop.png', fullPage: false });
  await page.keyboard.press('Escape');
  await page.clock.runFor(10000); await expect(page.locator('.countdown strong')).toHaveText(drawerTime);
  await page.locator('.answer-area').getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(8000);
  await expect(page.locator('.failure-reason')).toHaveText('Time’s up.');
  await expect(page.getByRole('button', { name: 'New session' })).toBeVisible();
});

test('reverse notes, simple/complex majors and inversions have educational shape/fingerings', async ({ page }) => {
  test.setTimeout(120000);
  await open(page); await openSettings(page); await page.getByLabel('Keyboard view').selectOption('single'); await closeSettings(page);
  await begin(page, 'keys', 'balanced'); await freeze(page);
  for (let index = 0; index < 81; index++) await answer(page);
  await expect(page.locator(main)).toHaveAttribute('data-stage', 'inversions');
  await expect(page.locator('.stage-progress')).toContainText('First inversion (simple)');
  const prompt = await page.locator('.challenge-heading h1').innerText();
  const expected = prompt.replace(/^Play /, '');
  // Wrong voice order, even in the pitch-class compact view.
  const root = expected.split(' ')[0];
  await page.locator(main).getByRole('button', { name: keyName(root + '4'), exact: true }).click();
  await page.locator(main).getByRole('button', { name: 'Piano key D4', exact: true }).click();
  await page.locator(main).getByRole('button', { name: 'Piano key B4', exact: true }).click();
  await expect(page.locator('.answer-popup')).toBeVisible();
  await expect(page.locator('.answer-reveal strong')).toHaveText(expected);
  await expect(page.locator('.lesson-keyboard .selected')).toHaveCount(3);
  await expect(page.locator('.lesson-keyboard .key-finger')).toHaveCount(3);
  await expect(page.locator('.lesson-keyboard .octave-number')).toHaveText(['4', '5']);
  await expect(page.locator('.lesson-keyboard .key-label')).toHaveCount(24);
  await expect(page.locator(`${piano} .key-label`)).toHaveCount(0);
  await expect(page.locator('.fingering-table tbody tr')).toHaveCount(3);
  await expect(page.locator('.fingering-table tbody tr').first()).toContainText('third');
  await expect(page.locator('.lesson-details')).toContainText('move the root up an octave');
  await page.screenshot({ path: '/tmp/piano-chord-lesson.png', fullPage: false });
  await page.setViewportSize({ width: 375, height: 812 });
  const popup = await page.locator('.answer-popup').boundingBox();
  expect(popup.width).toBeLessThanOrEqual(343);
  expect(popup.y).toBeGreaterThanOrEqual(16);
  expect(popup.y + popup.height).toBeLessThanOrEqual(796);
  await page.screenshot({ path: '/tmp/piano-mobile-chord-lesson.png', fullPage: false });
});

test('ear training audio, paused manual replay, mute and resume', async ({ page }) => {
  await open(page); await configure(page);
  await openSettings(page); await page.getByLabel('Hints', { exact: true }).selectOption('ear'); await page.locator('#repeat').focus(); await page.keyboard.press('Home'); await closeSettings(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click(); await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
  await expect(page.locator(`${piano} .selected`)).toHaveCount(0);
  await page.evaluate(async () => { const Tone = await import('tone'); window.meter = new Tone.Meter({ smoothing: 0 }); Tone.getDestination().connect(window.meter); });
  await expect.poll(() => page.evaluate(() => window.meter.getValue())).toBeGreaterThan(-60);
  await openSettings(page);
  await page.getByRole('switch', { name: 'Quiz sound', exact: true }).uncheck(); await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.meter.getValue())).toBeLessThan(-75);
  await page.getByRole('switch', { name: 'Quiz sound', exact: true }).check();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.meter.getValue())).toBeGreaterThan(-60);
  await closeSettings(page); await page.locator('.answer-area').getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.meter.getValue())).toBeGreaterThan(-60);
});

test('fullscreen mobile layout, drawer and responsive single octave', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await page.emulateMedia({ colorScheme: 'light' }); await open(page);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await expect(page.locator('header, nav, footer, .learning-path')).toHaveCount(0);
  await expect(page.locator(`${piano} button`)).toHaveCount(88);
  expect((await page.locator(piano).boundingBox()).width).toBe(375);
  await page.screenshot({ path: '/tmp/piano-mobile-full-dark.png', fullPage: false });
  await openSettings(page); await page.screenshot({ path: '/tmp/piano-mobile-drawer.png', fullPage: false });
  await page.getByLabel('Keyboard view').selectOption('single'); await closeSettings(page);
  await begin(page, 'keys', 'balanced');
  expect((await page.locator(piano).boundingBox()).width).toBe(375);
  await page.screenshot({ path: '/tmp/piano-mobile-single-dark.png', fullPage: false });
  await page.setViewportSize({ width: 600, height: 900 }); expect((await page.locator(piano).boundingBox()).width).toBe(600);
});

test('failed history writes retain timestamps and show the HTTP reason before retry', async ({ page, request }) => {
  const failed = [];
  await page.route('**/api/sessions', (route) => { failed.push(route.request().postDataJSON()); return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"offline"}' }); });
  await open(page); await begin(page); await wrong(page); await dismissResult(page);
  await expect(page.getByRole('alert')).toContainText('1 history entry not saved. HTTP 500: offline');
  await page.getByRole('button', { name: 'View result' }).click(); await page.getByRole('button', { name: 'New session' }).click(); await wrong(page); await dismissResult(page);
  await expect(page.getByRole('alert')).toContainText('2 history entries not saved');
  await page.unroute('**/api/sessions'); await page.getByRole('button', { name: 'Retry saves' }).click(); await expect(page.getByRole('alert')).toHaveCount(0);
  const data = await (await request.get('/api/history')).json();
  for (const entry of failed) expect(data.sessions.find((s) => s.id === entry.id)?.completed_at).toBe(entry.completedAt);
});

test('ear-only failure reveals the actual note and saved mistake', async ({ page, request }) => {
  await open(page); await configure(page); await openSettings(page); await page.getByLabel('Hints', { exact: true }).selectOption('ear'); await closeSettings(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click(); await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
  await expect(page.locator(`${piano} .selected`)).toHaveCount(0);
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/attempts') && r.request().method() === 'POST');
  await wrong(page); const response = await saved; const id = response.request().postDataJSON().id;
  const target = (await page.locator('.answer-reveal strong').innerText()).replaceAll('♯', '#');
  await expect(page.locator(`${piano} .selected`)).toHaveCount(1);
  const data = await (await request.get('/api/history')).json();
  expect(data.attempts.find((a) => a.id === id)).toMatchObject({ target, answer: 'H', result: 'wrong' });
  await page.screenshot({ path: '/tmp/piano-correct-answer.png', fullPage: false });
  await openStats(page); await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.locator('.mistake-table')).toContainText(target.replaceAll('#', '♯'));
});

test('saved Adaptive bias and Balanced mode choice survive reload', async ({ page, request }) => {
  const base = Date.now() - 10000;
  for (let index = 0; index < 4; index++) expect((await request.post('/api/attempts', { data: { id: `bias-${base}-${index}`, sessionId: `bias-${base}`, completedAt: new Date(base + index).toISOString(), target: 'C', stage: 'notes', inversion: 0, direction: 'hear', answer: 'D', result: 'wrong' } })).status()).toBe(201);
  const { practice } = await (await request.get('/api/history')).json();
  const choices = ['C','C#','D','D#','E','F','G','G#','A','A#','B'];
  const weights = choices.map((root) => 1 + 2 * Math.min(4, practice[`notes:${root}`] || 0));
  const roll = (1 / 11 + Math.min(weights[0] / weights.reduce((a,b) => a+b, 0), 2 / 11)) / 2;
  await page.addInitScript((roll) => { Math.random = () => roll; }, roll);
  await open(page); await begin(page); await expect(page.locator(`${piano} .selected`)).toHaveAttribute('data-note', 'C4');
  await wrong(page); await configure(page, 'hear', 'balanced'); await page.reload();
  await expect(page.getByLabel('Practice mix')).toHaveValue('balanced');
  await begin(page); await expect(page.locator(`${piano} .selected`)).toHaveAttribute('data-note', 'C#4');
});

test('queued offline mistakes merge with saved debt on switching to Adaptive', async ({ page, request }) => {
  const base = Date.now() - 1000;
  for (let index = 0; index < 8; index++) expect((await request.post('/api/attempts', { data: { id: `offline-${base}-${index}`, sessionId: `offline-${base}`, sequence: index + 1, completedAt: new Date(base + index).toISOString(), target: 'C', stage: 'notes', inversion: 0, direction: 'hear', answer: 'D', result: 'wrong' } })).status()).toBe(201);
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.route('**/api/history*', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/attempts', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await open(page); await begin(page, 'hear', 'balanced'); await wrong(page); await dismissResult(page);
  await expect(page.getByRole('alert')).toContainText('1 history entry not saved');
  await page.unroute('**/api/history*'); await configure(page, 'hear', 'adaptive');
  await page.getByRole('button', { name: 'View result' }).click(); await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.locator(`${piano} .selected`)).toHaveAttribute('data-note', 'C#4');
  const { practice } = await (await request.get('/api/history')).json();
  const others = ['D','D#','E','F','F#','G','G#','A','A#','B'].reduce((sum, root) => sum + 1 + 2 * Math.min(4, practice[`notes:${root}`] || 0), 0);
  const roll = (3 / (others + 3) + 9 / (others + 9)) / 2;
  await page.evaluate((roll) => { Math.random = () => roll; }, roll); await answer(page);
  await expect(page.locator(`${piano} .selected`)).toHaveAttribute('data-note', 'C4');
});

test('API accepts Mixed/completed sessions, rejects invalid writes, and deduplicates', async ({ request }) => {
  const entry = { id: `api-${Date.now()}`, completedAt: new Date().toISOString(), score: 150, correctAnswers: 1, stage: 'notes', endReason: 'complete', direction: 'mixed', keyboard: 'single', mode: 'visual', startSeconds: 8, repeatSeconds: 2, endOnWrong: true };
  expect((await request.post('/api/sessions', { data: entry })).status()).toBe(201);
  expect((await request.post('/api/sessions', { data: entry })).status()).toBe(201);
  const data = await (await request.get('/api/history')).json(); expect(data.sessions.filter((s) => s.id === entry.id)).toHaveLength(1);
  expect((await request.post('/api/sessions', { data: { ...entry, score: -1 } })).status()).toBe(400);
  expect((await request.post('/api/sessions', { data: entry, headers: { Origin: 'https://evil.example' } })).status()).toBe(403);
  expect((await request.post('/api/sessions', { data: JSON.stringify(entry), headers: { 'Content-Type': 'text/plain' } })).status()).toBe(415);
  expect((await request.get('/data/history.sqlite')).status()).toBe(404);
  const attempt = { id: `timing-${Date.now()}`, sessionId: entry.id, completedAt: entry.completedAt, target: 'C', stage: 'notes', inversion: 0, direction: 'hear', answer: 'C', result: 'correct', responseSeconds: 1.25, durationSeconds: 8 };
  expect((await request.post('/api/attempts', { data: attempt })).status()).toBe(201);
  expect((await request.post('/api/attempts', { data: { ...attempt, responseSeconds: 7 } })).status()).toBe(201);
  expect((await request.post('/api/attempts', { data: { ...attempt, responseSeconds: 9 } })).status()).toBe(400);
  expect((await request.post('/api/attempts', { data: { ...attempt, id: `${attempt.id}-legacy`, responseSeconds: undefined, durationSeconds: undefined } })).status()).toBe(201);
  const updated = await (await request.get('/api/history')).json();
  expect(updated.timings.filter((row) => row.id === attempt.id)).toHaveLength(1);
  expect(updated.timings.find((row) => row.id === attempt.id)).toMatchObject({ response_seconds: 1.25, duration_seconds: 8 });
  expect(updated.timings.some((row) => row.id === `${attempt.id}-legacy`)).toBe(false);
});
