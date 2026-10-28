// Level: unit
/**
 * The one line /next and the board print when the README has probably fallen behind.
 * Plain objects in, a string or null out — the git reads live in readmeFreshnessAt.
 */
import { readmeFreshness } from '../scripts/readme-freshness.js';

const feature = (id, status = 'shipped') => ({
  id, status, layer: 'product', type: 'feature',
});

const base = {
  level: 'writes',
  refreshedAt: '',
  catalogNow: [],
  catalogThen: [],
  refreshedOn: null,
  today: '2026-10-21',
};

describe('readmeFreshness', () => {
  it('says nothing when the level is not writes or suggests', () => {
    const catalogNow = [feature('alpha')];
    expect(readmeFreshness({ ...base, level: 'manual', catalogNow })).toBeNull();
    expect(readmeFreshness({ ...base, level: null, catalogNow })).toBeNull();
    expect(readmeFreshness({ ...base, level: 'suggests', catalogNow })).toBe(
      'README not refreshed yet; 1 shipped feature or improvement: alpha. Run /refresh-readme.',
    );
  });

  it('says nothing when nothing has ever shipped and the README was never refreshed', () => {
    expect(readmeFreshness({
      ...base,
      catalogNow: [feature('alpha', 'shaped'), { id: 'bug-1', status: 'shipped', layer: 'product', type: 'bug' }],
    })).toBeNull();
  });

  it('names every shipped product feature and improvement when the README was never refreshed', () => {
    expect(readmeFreshness({
      ...base,
      catalogNow: [
        feature('alpha'),
        { id: 'beta', status: 'shipped', layer: 'product', type: 'improvement' },
        feature('gamma', 'shaped'),
      ],
    })).toBe(
      'README not refreshed yet; 2 shipped features and improvements: alpha, beta. Run /refresh-readme.',
    );
  });

  it('uses the singular when exactly one has shipped and the README was never refreshed', () => {
    expect(readmeFreshness({ ...base, catalogNow: [feature('alpha')] })).toBe(
      'README not refreshed yet; 1 shipped feature or improvement: alpha. Run /refresh-readme.',
    );
  });

  it('says the refresh point was not found when that catalog cannot be read', () => {
    expect(readmeFreshness({
      ...base,
      refreshedAt: 'abcdef1234567890',
      catalogNow: [feature('alpha')],
      catalogThen: null,
      refreshedOn: null,
    })).toBe('README refresh point abcdef1 not found. Run /refresh-readme.');
  });

  it('says nothing when nothing countable has shipped since a readable refresh', () => {
    const catalogNow = [
      feature('alpha'),
      { id: 'kept-bug', status: 'shipped', layer: 'product', type: 'bug' },
      { id: 'kept-fw', status: 'shipped', layer: 'framework', type: 'feature' },
    ];
    expect(readmeFreshness({
      ...base,
      refreshedAt: 'abcdef1234567890',
      catalogNow,
      catalogThen: catalogNow,
      refreshedOn: '2026-10-01',
    })).toBeNull();
  });

  it('names what shipped since the refresh, in catalog order, with the whole days between', () => {
    expect(readmeFreshness({
      ...base,
      refreshedAt: 'abcdef1234567890',
      catalogNow: [
        feature('alpha'),
        feature('beta'),
        { id: 'gamma', status: 'shipped', layer: 'product', type: 'improvement' },
        feature('delta', 'shaped'),
      ],
      catalogThen: [feature('alpha'), feature('beta', 'shaped')],
      refreshedOn: '2026-10-01',
    })).toBe(
      'README last refreshed 2026-10-01 (20 days ago); 2 shipped since: beta, gamma. Run /refresh-readme.',
    );
  });

  it('uses the singular when exactly one has shipped since', () => {
    expect(readmeFreshness({
      ...base,
      refreshedAt: 'abcdef1234567890',
      catalogNow: [feature('alpha'), feature('beta')],
      catalogThen: [feature('alpha')],
      refreshedOn: '2026-10-20',
    })).toBe(
      'README last refreshed 2026-10-20 (1 days ago); 1 shipped since: beta. Run /refresh-readme.',
    );
  });

  it('does not count a bug or a framework entry shipped since', () => {
    expect(readmeFreshness({
      ...base,
      refreshedAt: 'abcdef1234567890',
      catalogNow: [
        feature('alpha'),
        { id: 'a-bug', status: 'shipped', layer: 'product', type: 'bug' },
        { id: 'a-fw', status: 'shipped', layer: 'framework', type: 'feature' },
        { id: 'a-chore', status: 'shipped', layer: 'product', type: 'chore' },
        { id: 'a-spike', status: 'shipped', layer: 'product', type: 'spike' },
      ],
      catalogThen: [],
      refreshedOn: '2026-10-01',
    })).toBe(
      'README last refreshed 2026-10-01 (20 days ago); 1 shipped since: alpha. Run /refresh-readme.',
    );
  });

  it('never counts a negative number of days', () => {
    const line = readmeFreshness({
      level: 'writes',
      refreshedAt: 'abcdef1',
      catalogNow: [{ id: 'later', status: 'shipped', layer: 'product', type: 'feature' }],
      catalogThen: [],
      refreshedOn: '2026-10-22',
      today: '2026-10-21',
    });
    expect(line).toContain('(0 days ago)');
  });
});
