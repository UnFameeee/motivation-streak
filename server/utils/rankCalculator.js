/**
 * Calculate user rank based on streak days and constants
 * @param {number} daysCount - Number of consecutive activity days
 * @param {number} constant - Rank constant (X for translation, Y for writing)
 * @param {number} daiCanhGioiCount - Total number of Đại Cảnh Giới tiers
 * @param {number} canhConCount - Total number of Cảnh Con tiers
 * @param {number} dangCount - Total number of Đẳng tiers
 * @returns {Object} - Calculated rank tiers
 */
function calculateRank(daysCount, constant, daiCanhGioiCount, canhConCount, dangCount) {
  // Calculate Đẳng tier (1-based index)
  const dangDivisor = constant / dangCount;
  const dangTier = Math.floor((daysCount / dangDivisor) % dangCount) + 1;

  // Calculate Cảnh Con tier (1-based index)
  const canhConDivisor = constant * canhConCount;
  const canhConTier = Math.floor((daysCount / canhConDivisor) % canhConCount) + 1;

  // Calculate Đại Cảnh Giới tier (1-based index)
  const daiCanhGioiDivisor = constant * daiCanhGioiCount * canhConCount;
  const daiCanhGioiTier = Math.floor((daysCount / daiCanhGioiDivisor) % daiCanhGioiCount) + 1;

  return {
    daiCanhGioiTier,
    canhConTier,
    dangTier
  };
}

/**
 * Calculate days required to reach a specific rank
 * @param {number} daiCanhGioiTier - Desired Đại Cảnh Giới tier (1-based)
 * @param {number} canhConTier - Desired Cảnh Con tier (1-based)
 * @param {number} dangTier - Desired Đẳng tier (1-based)
 * @param {number} constant - Rank constant (X for translation, Y for writing)
 * @param {number} daiCanhGioiCount - Total number of Đại Cảnh Giới tiers
 * @param {number} canhConCount - Total number of Cảnh Con tiers
 * @param {number} dangCount - Total number of Đẳng tiers
 * @returns {number} - Days required to reach the rank
 */
function calculateDaysToRank(daiCanhGioiTier, canhConTier, dangTier, constant, daiCanhGioiCount, canhConCount, dangCount) {
  const dangBase = (dangTier - 1) * (constant / dangCount);
  const canhConBase = (canhConTier - 1) * constant * canhConCount;
  const daiCanhGioiBase = (daiCanhGioiTier - 1) * constant * daiCanhGioiCount * canhConCount;
  
  return Math.ceil(dangBase + canhConBase + daiCanhGioiBase);
}

module.exports = {
  calculateRank,
  calculateDaysToRank
}; 