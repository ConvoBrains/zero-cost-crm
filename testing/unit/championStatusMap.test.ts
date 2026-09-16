import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTACT_STATUSES, DEFAULT_STAGES } from '../../src/defaults';
import {
  championMapToRows,
  championRowsToMap,
  unusedContactStatuses,
  validateChampionMapRows,
  validateChampionStatusToStage,
} from '../../src/lib/championStatusMap';

const statuses = [...DEFAULT_CONTACT_STATUSES];
const stages = [...DEFAULT_STAGES];

describe('championMapToRows / championRowsToMap', () => {
  it('drops null targets when building editor rows', () => {
    const rows = championMapToRows({
      Interested: 'Discovery Call Done',
      'Not Contacted': null,
      Called: 'Discovery Call Done',
    });
    expect(rows.map((r) => r.status)).toEqual(['Interested', 'Called']);
    expect(championRowsToMap(rows)).toEqual({
      Interested: 'Discovery Call Done',
      Called: 'Discovery Call Done',
    });
  });
});

describe('validateChampionStatusToStage', () => {
  it('accepts an empty map', () => {
    expect(validateChampionStatusToStage({}, statuses, stages)).toBeNull();
  });

  it('accepts configured status/stage pairs and null targets', () => {
    expect(
      validateChampionStatusToStage(
        { Interested: 'Discovery Call Done', 'Not Contacted': null },
        statuses,
        stages
      )
    ).toBeNull();
  });

  it('rejects a status that is not in the configured list', () => {
    expect(validateChampionStatusToStage({ Engaged: 'Follow-up' }, statuses, stages)).toBe(
      'championStatusToStage key "Engaged" is not a configured contact status.'
    );
  });

  it('rejects a stage that is not in the configured list', () => {
    expect(
      validateChampionStatusToStage({ Interested: 'Outreach Positive' }, statuses, stages)
    ).toBe('championStatusToStage["Interested"] targets unknown stage "Outreach Positive".');
  });
});

describe('validateChampionMapRows', () => {
  it('rejects duplicate statuses', () => {
    expect(
      validateChampionMapRows(
        [
          { id: 'a', status: 'Interested', stage: 'Follow-up' },
          { id: 'b', status: 'Interested', stage: 'Discovery Call Done' },
        ],
        statuses,
        stages
      )
    ).toBe('Contact status "Interested" is mapped more than once.');
  });

  it('rejects an empty status or stage', () => {
    expect(
      validateChampionMapRows([{ id: 'a', status: '', stage: 'Follow-up' }], statuses, stages)
    ).toBe('Each mapping needs a contact status.');
    expect(
      validateChampionMapRows([{ id: 'a', status: 'Interested', stage: '' }], statuses, stages)
    ).toBe('Each mapping needs a pipeline stage.');
  });
});

describe('unusedContactStatuses', () => {
  it('omits statuses already used on other rows', () => {
    const rows = [{ id: 'a', status: 'Interested', stage: 'Follow-up' }];
    expect(unusedContactStatuses(['Interested', 'Called'], rows)).toEqual(['Called']);
    expect(unusedContactStatuses(['Interested', 'Called'], rows, 'Interested')).toEqual([
      'Interested',
      'Called',
    ]);
  });
});
