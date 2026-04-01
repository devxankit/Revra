const { getCurrentSalesMonthRange } = require('../salesMonthRange');
const salesMonthConfig = require('../salesMonthConfig');

jest.mock('../salesMonthConfig', () => {
  const original = jest.requireActual('../salesMonthConfig');
  return {
    ...original,
    getSalesMonthConfig: jest.fn(),
  };
});

describe('getCurrentSalesMonthRange', () => {
  const getSalesMonthConfig = salesMonthConfig.getSalesMonthConfig;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('falls back to calendar month when config is default 1/0', async () => {
    getSalesMonthConfig.mockResolvedValue({
      salesMonthStartDay: 1,
      salesMonthEndDay: 0,
      timezone: 'local',
    });

    const now = new Date(2026, 1, 15); // Feb 15, 2026
    const { start, end } = await getCurrentSalesMonthRange(now);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(1);
    expect(start.getDate()).toBe(1);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(1);
    expect(end.getDate()).toBe(28); // Feb 2026 has 28 days
  });

  test('supports cross-month range like 10–10', async () => {
    getSalesMonthConfig.mockResolvedValue({
      salesMonthStartDay: 10,
      salesMonthEndDay: 10,
      timezone: 'local',
    });

    const now = new Date(2026, 0, 15); // Jan 15, 2026
    const { start, end } = await getCurrentSalesMonthRange(now);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(10);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(1);
    expect(end.getDate()).toBe(10);
  });
});

